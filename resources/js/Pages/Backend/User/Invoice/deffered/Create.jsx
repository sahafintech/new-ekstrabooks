import { useForm } from "@inertiajs/react";
import { Label } from "@/Components/ui/label";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { SidebarInset, SidebarSeparator } from "@/Components/ui/sidebar";
import PageHeader from "@/Components/PageHeader";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Button } from "@/Components/ui/button";
import { toast } from "sonner";
import { SearchableCombobox } from "@/Components/ui/searchable-combobox";
import { Textarea } from "@/Components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import { SearchableMultiSelectCombobox } from "@/Components/ui/searchable-multiple-combobox";
import DateTimePicker from "@/Components/DateTimePicker";
import { Plus, Trash2, X } from "lucide-react";

export default function Create({ customers = [], products = [], currencies = [], taxes = [], invoice_title, decimalPlace, familySizes = [], benefits = [], base_currency }) {
    const [invoiceItems, setInvoiceItems] = useState([{
        product_id: "",
        product_name: "",
        description: "",
        quantity: 1,
        unit_cost: 0,
    }]);

    const [attachments, setAttachments] = useState([{
        file_name: "",
        file: null
    }]);

    const [exchangeRate, setExchangeRate] = useState(1);
    const [baseCurrencyInfo, setBaseCurrencyInfo] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        customer_id: "",
        title: invoice_title,
        invoice_number: "",
        order_number: "",
        invoice_date: new Date(),
        due_date: "",
        currency: base_currency,
        exchange_rate: 1,
        deffered_start: "",
        deffered_end: "",
        active_days: 0,
        cost_per_day: 0,
        invoice_category: "",
        converted_total: 0,
        discount_type: "0",
        discount_value: 0,
        template: 0,
        note: "",
        footer: "",
        attachments: [],
        product_id: [],
        product_name: [],
        description: [],
        quantity: [],
        unit_cost: [],
        sum_insured: [],
        limits: [],
        benefits: [],
        family_size: [],
        taxes: [],
        deffered_total: 0,
        earnings: [],
    });

    const invoiceCategories = [
        { id: "1", option: "Medical Insurance Invoice", value: "medical" },
        { id: "2", option: "GPA Insurance Invoice", value: "gpa" },
        { id: "3", option: "Other Insurance Invoice", value: "other" }
    ];

    const addInvoiceItem = () => {
        setInvoiceItems([...invoiceItems, {
            product_id: "",
            product_name: "",
            description: "",
            quantity: 1,
            unit_cost: 0,
        }]);
        setData("product_id", [...data.product_id, ""]);
        setData("product_name", [...data.product_name, ""]);
        setData("description", [...data.description, ""]);
        setData("quantity", [...data.quantity, 1]);
        setData("unit_cost", [...data.unit_cost, 0]);
        setData("sum_insured", [...data.sum_insured, 0]);
        setData("limits", [...data.limits, 0]);
        setData("benefits", [...data.benefits, ""]);
        setData("family_size", [...data.family_size, 0]);
    };

    const removeInvoiceItem = (index) => {
        const updatedItems = invoiceItems.filter((_, i) => i !== index);
        setInvoiceItems(updatedItems);
        setData("product_id", updatedItems.map(item => item.product_id));
        setData("product_name", updatedItems.map(item => item.product_name));
        setData("description", updatedItems.map(item => item.description));
        setData("quantity", updatedItems.map(item => item.quantity));
        setData("unit_cost", updatedItems.map(item => item.unit_cost));
        setData("sum_insured", updatedItems.map(item => item.sum_insured));
        setData("limits", updatedItems.map(item => item.limits));
        setData("benefits", updatedItems.map(item => item.benefits));
        setData("family_size", updatedItems.map(item => item.family_size));
    };

    const updateInvoiceItem = (index, field, value) => {
        const updatedItems = [...invoiceItems];
        updatedItems[index][field] = value;

        if (field === "product_id") {
            const product = products.find(p => p.id === parseInt(value, 10));
            if (product) {
                updatedItems[index].product_name = product.name;
                updatedItems[index].unit_cost = product.selling_price;

                // Also update the description if it's empty
                if (!updatedItems[index].description) {
                    updatedItems[index].description = product.description || "";
                }
            }
        }

        setInvoiceItems(updatedItems);
        setData("product_id", updatedItems.map(item => item.product_id));
        setData("product_name", updatedItems.map(item => item.product_name));
        setData("description", updatedItems.map(item => item.description));
        setData("quantity", updatedItems.map(item => item.quantity));
        setData("unit_cost", updatedItems.map(item => item.unit_cost));
        setData("sum_insured", updatedItems.map(item => item.sum_insured));
        setData("limits", updatedItems.map(item => item.limits));
        setData("benefits", updatedItems.map(item => item.benefits));
        setData("family_size", updatedItems.map(item => item.family_size));
    };

    const calculateSubtotal = () => {
        return invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    };

    const calculateEarnings = () => {
        const startDate = new Date(data.deffered_start);
        const endDate = new Date(data.deffered_end);
        const subTotal = calculateSubtotal();      // e.g. 500.00
        const dp = decimalPlace;             // e.g. 2

        const msPerDay = 24 * 60 * 60 * 1000;
        // inclusive days
        const totalDays = Math.floor((endDate - startDate) / msPerDay) + 1;

        // convert subtotal → "cents" (or smallest unit)
        const factor = Math.pow(10, dp);
        const subTotalUnits = Math.round(subTotal * factor);

        // integer per-day cost (floor)
        const unitsPerDay = Math.floor(subTotalUnits / totalDays);

        // build the schedule in integer units
        const scheduleUnits = [];
        let cursor = new Date(startDate);
        let usedUnits = 0;

        while (cursor <= endDate) {
            const year = cursor.getFullYear();
            const month = cursor.getMonth();

            const sliceStart = (year === startDate.getFullYear() && month === startDate.getMonth())
                ? new Date(startDate)
                : new Date(year, month, 1);

            const monthEnd = new Date(year, month + 1, 0);

            const sliceEnd = monthEnd < endDate
                ? monthEnd
                : new Date(endDate);

            const days = Math.floor((sliceEnd - sliceStart) / msPerDay) + 1;
            const sliceUnits = unitsPerDay * days;

            scheduleUnits.push({ sliceStart, sliceEnd, days, sliceUnits });
            usedUnits += sliceUnits;

            cursor = new Date(year, month + 1, 1);
        }

        // leftover cents
        const remainder = subTotalUnits - usedUnits;
        if (scheduleUnits.length && remainder !== 0) {
            scheduleUnits[scheduleUnits.length - 1].sliceUnits += remainder;
        }

        // finally, convert back to decimals
        const schedule = scheduleUnits.map(u => ({
            start_date: u.sliceStart,
            end_date: u.sliceEnd,
            number_of_days: u.days,
            amount: +(u.sliceUnits / factor).toFixed(dp)
        }));

        // return everything you need
        return { schedule, totalDays, costPerDay: subTotalUnits / factor / totalDays };
    };

    useEffect(() => {
        if (data.deffered_start && data.deffered_end && calculateSubtotal() > 0) {
            const { schedule, totalDays, costPerDay } = calculateEarnings();
            setData('earnings', schedule);

            // now push form-fields back into your Inertia form
            setData('active_days', totalDays);
            setData('cost_per_day', +costPerDay.toFixed(decimalPlace));

            // (and if you need deferred_total too):
            const slicedTotal = schedule.reduce((sum, e) => sum + e.amount, 0);
            setData('deffered_total', +slicedTotal.toFixed(decimalPlace));
        }
    }, [data.deffered_start, data.deffered_end, invoiceItems]);

    // build this once, outside of calculateTaxes
    const taxRateMap = new Map(taxes.map(t => [t.id, Number(t.rate)]));

    const calculateTaxes = () => {
        return invoiceItems.reduce((sum, item) => {
            const base = Number(item.quantity) * Number(item.unit_cost);

            const itemTax = data.taxes.reduce((taxSum, taxIdStr) => {
                // convert the incoming tax-ID string to a Number
                const taxId = Number(taxIdStr);

                // look up the rate; if missing, default to 0
                const rate = taxRateMap.get(taxId) || 0;

                return taxSum + (base * rate) / 100;
            }, 0);

            return sum + itemTax;
        }, 0);
    };

    const calculateDiscount = () => {
        const subtotal = calculateSubtotal();
        if (data.discount_type === "0") {
            return (subtotal * data.discount_value) / 100;
        }
        return data.discount_value;
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const taxes = calculateTaxes();
        const discount = calculateDiscount();
        return (subtotal + taxes) - discount;
    };

    // Find and set base currency on component mount
    useEffect(() => {
        // First try to find a currency with base_currency flag set to 1
        let baseC = currencies.find(c => c.base_currency === 1);

        // If still none found, just take the first currency as a fallback
        if (!baseC && currencies.length > 0) {
            baseC = currencies[0];
        }

        if (baseC) {
            setBaseCurrencyInfo(baseC);
        }
    }, [currencies]);

    // Update exchange rate whenever the selected currency changes
    const handleCurrencyChange = (currencyName) => {
        // Find currency object by name
        const currencyObj = currencies.find(currency => currency.name === currencyName);

        if (currencyObj) {

            // Set the exchange rate directly from the selected currency object first as a fallback
            const currentRate = parseFloat(currencyObj.exchange_rate);
            setExchangeRate(currentRate);
            setData('exchange_rate', currentRate);

            // Then try to fetch the updated exchange rate from the API
            fetch(`/user/find_currency/${currencyObj.name}`)
                .then(response => response.json())
                .then(apiData => {
                    if (apiData && apiData.exchange_rate) {
                        const apiRate = parseFloat(apiData.exchange_rate);
                        setExchangeRate(apiRate);
                        setData('exchange_rate', apiRate);
                    }
                })
                .catch(error => {
                    console.error("Error fetching currency rate:", error);
                    // Already set the fallback exchange rate above
                });
        }
    };

    // Update converted_total whenever relevant values change
    useEffect(() => {
        const total = calculateTotal();
        const convertedTotal = total;
        setData('converted_total', convertedTotal);
    }, [data.currency, invoiceItems, data.discount_type, data.discount_value, exchangeRate]);

    const renderTotal = () => {
        const total = calculateTotal();
        const selectedCurrency = currencies.find(c => c.name === data.currency);

        if (!selectedCurrency) {
            return (
                <div>
                    <h2 className="text-xl font-bold">Total: 0.00</h2>
                </div>
            );
        }

        // If we have a base currency AND the selected currency is different from base
        if (baseCurrencyInfo &&
            selectedCurrency.name !== baseCurrencyInfo.name &&
            exchangeRate &&
            exchangeRate !== 1) {

            // Calculate the base currency equivalent
            const baseCurrencyTotal = total / exchangeRate;

            return (
                <div>
                    <h2 className="text-xl font-bold">Total: {formatCurrency({ amount: total, currency: selectedCurrency.name, decimalPlace: decimalPlace })}</h2>
                    <p className="text-sm text-gray-600">
                        Equivalent to {formatCurrency({ amount: baseCurrencyTotal, currency: baseCurrencyInfo.name, decimalPlace: decimalPlace })}
                    </p>
                </div>
            );
        }

        return (
            <div>
                <h2 className="text-xl font-bold">Total: {formatCurrency({ amount: total, currency: selectedCurrency.name, decimalPlace: decimalPlace })}</h2>
            </div>
        );
    };

    const submit = (e) => {
        e.preventDefault();

        // Find the selected currency object to get its name
        const selectedCurrency = currencies.find(c => c.name === data.currency);

        if (!selectedCurrency) {
            toast.error("Please select a valid currency");
            return;
        }

        // Create a new data object with all the required fields
        const formData = {
            ...data,
            currency: selectedCurrency.name,
            exchange_rate: exchangeRate,
            product_id: invoiceItems.map(item => item.product_id),
            product_name: invoiceItems.map(item => item.product_name),
            description: invoiceItems.map(item => item.description),
            quantity: invoiceItems.map(item => item.quantity),
            unit_cost: invoiceItems.map(item => item.unit_cost),
            sum_insured: invoiceItems.map(item => item.sum_insured),
            limits: invoiceItems.map(item => item.limits),
            benefits: invoiceItems.map(item => item.benefits),
            family_size: invoiceItems.map(item => item.family_size),
            attachments: attachments.map(attachment => ({
                file_name: attachment.file_name,
                file: attachment.file
            }))
        };

        // Log the data being sent to help debug
        console.log("Submitting form with data:", formData);

        // Post the form data directly instead of using setData first
        post(route("deffered_invoices.store"), formData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Invoice created successfully");
                reset();
                setInvoiceItems([{
                    product_id: "",
                    product_name: "",
                    description: "",
                    quantity: 1,
                    unit_cost: 0,
                    sum_insured: 0,
                    limits: 0,
                    benefits: "",
                    family_size: "",
                }]);
                setAttachments([{
                    file_name: "",
                    file: null
                }]);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <SidebarInset>
                <PageHeader page="Deffered Invoices" subpage="Create New" url="deffered_invoices.index" />

                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <form onSubmit={submit}>
                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="customer_id" className="md:col-span-2 col-span-12">
                                Customer *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <div className="md:w-1/2 w-full">
                                    <SearchableCombobox
                                        options={customers.map(customer => ({
                                            id: customer.id,
                                            name: customer.name
                                        }))}
                                        value={data.customer_id}
                                        onChange={(value) => setData("customer_id", value)}
                                        placeholder="Select customer"
                                    />
                                </div>
                                <InputError message={errors.customer_id} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="title" className="md:col-span-2 col-span-12">
                                Title *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <Input
                                    id="title"
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData("title", e.target.value)}
                                    className="md:w-1/2 w-full"
                                    required
                                />
                                <InputError message={errors.title} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="order_number" className="md:col-span-2 col-span-12">
                                Policy Number *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <Input
                                    id="order_number"
                                    type="text"
                                    value={data.order_number}
                                    onChange={(e) => setData("order_number", e.target.value)}
                                    className="md:w-1/2 w-full"
                                    required
                                />
                                <InputError message={errors.order_number} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="invoice_date" className="md:col-span-2 col-span-12">
                                Invoice Date *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <DateTimePicker
                                    value={data.invoice_date}
                                    onChange={(date) => setData("invoice_date", date)}
                                    className="md:w-1/2 w-full"
                                    required
                                />
                                <InputError message={errors.invoice_date} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="due_date" className="md:col-span-2 col-span-12">
                                Due Date *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <DateTimePicker
                                    value={data.due_date}
                                    onChange={(date) => setData("due_date", date)}
                                    className="md:w-1/2 w-full"
                                    required
                                />
                                <InputError message={errors.due_date} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="invoice_category" className="md:col-span-2 col-span-12">
                                Invoice Category *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <div className="md:w-1/2 w-full">
                                    <SearchableCombobox
                                        className="mt-1"
                                        options={invoiceCategories.map(category => ({
                                            id: category.value,
                                            label: category.option,
                                            name: category.option
                                        }))}
                                        value={data.invoice_category}
                                        onChange={(selectedValue) => setData("invoice_category", selectedValue)}
                                        placeholder="Select invoice category"
                                    />
                                </div>
                                <InputError message={errors.invoice_category} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="currency" className="md:col-span-2 col-span-12">
                                Currency *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <div className="md:w-1/2 w-full">
                                    <SearchableCombobox
                                        className="mt-1"
                                        options={currencies.map(currency => ({
                                            id: currency.name,
                                            value: currency.name,
                                            label: currency.name,
                                            name: `${currency.name} - ${currency.description} (${currency.exchange_rate})`
                                        }))}
                                        value={data.currency}
                                        onChange={(selectedValue) => {
                                            console.log("Currency selected:", selectedValue);
                                            setData("currency", selectedValue);
                                            handleCurrencyChange(selectedValue);
                                        }}
                                        placeholder="Select currency"
                                    />
                                </div>
                                <InputError message={errors.currency} className="text-sm" />
                            </div>
                        </div>

                        <SidebarSeparator className="my-4" />

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Invoice Items</h3>
                                <Button variant="secondary" type="button" onClick={addInvoiceItem}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Item
                                </Button>
                            </div>

                            {data.invoice_category !== "" ? (
                                invoiceItems.map((item, index) => (
                                    <div key={index} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                                        {/* First Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            <div>
                                                <Label>Service *</Label>
                                                <SearchableCombobox
                                                    options={products.map(product => ({
                                                        id: product.id,
                                                        name: product.name
                                                    }))}
                                                    value={item.product_id}
                                                    onChange={(value) => updateInvoiceItem(index, "product_id", value)}
                                                    placeholder="Select service"
                                                />
                                            </div>

                                            <div>
                                                {data.invoice_category === "medical" ? (
                                                    <Label>Members *</Label>
                                                ) : (
                                                    <Label>Quantity *</Label>
                                                )}
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateInvoiceItem(index, "quantity", parseInt(e.target.value))}
                                                />
                                            </div>

                                            {data.invoice_category === "medical" && (
                                                <div>
                                                    <Label>Family Size *</Label>
                                                    <SearchableCombobox
                                                        options={familySizes.map(size => ({
                                                            id: size.size,
                                                            name: size.size
                                                        }))}
                                                        value={item.family_size}
                                                        onChange={(value) => updateInvoiceItem(index, "family_size", value)}
                                                        placeholder="Select family size"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <Label>Benefits *</Label>
                                                <SearchableCombobox
                                                    options={benefits.map(benefit => ({
                                                        id: benefit.name,
                                                        name: benefit.name
                                                    }))}
                                                    value={item.benefits}
                                                    onChange={(value) => updateInvoiceItem(index, "benefits", value)}
                                                    placeholder="Select benefits"
                                                />
                                            </div>
                                        </div>

                                        {/* Second Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-4 gap-2">
                                            {data.invoice_category !== "other" && (
                                                <div>
                                                    <Label>Limits</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.limits}
                                                        onChange={(e) => updateInvoiceItem(index, "limits", parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            )}

                                            {data.invoice_category === "other" && (
                                                <div>
                                                    <Label>Sum Insured</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.sum_insured}
                                                        onChange={(e) => updateInvoiceItem(index, "sum_insured", parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <Label>Rate *</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.unit_cost}
                                                    onChange={(e) => updateInvoiceItem(index, "unit_cost", parseFloat(e.target.value))}
                                                />
                                            </div>

                                            <div>
                                                <Label>Subtotal</Label>
                                                <div className="p-2 bg-white rounded text-right">
                                                    {(item.quantity * item.unit_cost).toFixed(2)}
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-end">
                                                {invoiceItems.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500"
                                                        onClick={() => removeInvoiceItem(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No category selected</p>
                            )}
                        </div>

                        <SidebarSeparator className="my-4" />

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="deffered_start" className="md:col-span-2 col-span-12">
                                Policy Start *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <DateTimePicker
                                    value={data.deffered_start}
                                    onChange={(date) => setData("deffered_start", date)}
                                    className="md:w-1/2 w-full"
                                    required
                                />
                                <InputError message={errors.deffered_start} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="deffered_end" className="md:col-span-2 col-span-12">
                                Policy End *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <DateTimePicker
                                    value={data.deffered_end}
                                    onChange={(date) => setData("deffered_end", date)}
                                    className="md:w-1/2 w-full"
                                    required
                                />
                                <InputError message={errors.deffered_end} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="active_days" className="md:col-span-2 col-span-12">
                                Active Days *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <Input
                                    id="active_days"
                                    type="number"
                                    value={data.active_days}
                                    onChange={(e) => setData("active_days", parseInt(e.target.value))}
                                    className="md:w-1/2 w-full"
                                    required
                                    readOnly
                                />
                                <InputError message={errors.active_days} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="cost_per_day" className="md:col-span-2 col-span-12">
                                Cost Per Days *
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <Input
                                    id="cost_per_day"
                                    type="number"
                                    value={data.cost_per_day}
                                    onChange={(e) => setData("cost_per_day", parseInt(e.target.value))}
                                    className="md:w-1/2 w-full"
                                    required
                                    readOnly
                                />
                                <InputError message={errors.cost_per_day} className="text-sm" />
                            </div>
                        </div>

                        <SidebarSeparator className="my-4" />

                        <div>
                            <p>Deferred Earning Schedule</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Earning Start Date</TableHead>
                                        <TableHead>Earning End Date</TableHead>
                                        <TableHead>No Of Days</TableHead>
                                        <TableHead>Earning recognized</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.earnings.length > 0 ? (
                                        data.earnings.map((earning) => (
                                            <TableRow key={earning.id}>
                                                <TableCell>{new Date(earning.start_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{new Date(earning.end_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{earning.number_of_days}</TableCell>
                                                <TableCell className="text-right">{formatCurrency({ amount: earning.amount })}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={10} className="h-24 text-center">
                                                No earnings found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow>
                                        <TableCell>TOTAL:</TableCell>
                                        <TableCell colSpan={9} className="text-right">
                                            {formatCurrency({ amount: data.deffered_total })}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <SidebarSeparator className="my-4" />

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="taxes" className="md:col-span-2 col-span-12">
                                Tax
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <div className="md:w-1/2 w-full">
                                    <SearchableMultiSelectCombobox
                                        options={taxes?.map(tax => ({
                                            id: tax.id,
                                            name: `${tax.name} (${tax.rate}%)`
                                        }))}
                                        value={data.taxes}
                                        onChange={(values) => setData("taxes", values)}
                                        placeholder="Select taxes"
                                    />
                                </div>
                                <InputError message={errors.taxes} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="discount_type" className="md:col-span-2 col-span-12">
                                Discount Type
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <div className="md:w-1/2 w-full">
                                    <SearchableCombobox
                                        options={[
                                            { id: "0", name: "Percentage (%)" },
                                            { id: "1", name: "Fixed Amount" }
                                        ]}
                                        value={data.discount_type}
                                        onChange={(value) => setData("discount_type", value)}
                                        placeholder="Select discount type"
                                    />
                                </div>
                                <InputError message={errors.discount_type} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="discount_value" className="md:col-span-2 col-span-12">
                                Discount Value
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <Input
                                    id="discount_value"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.discount_value}
                                    onChange={(e) => setData("discount_value", parseFloat(e.target.value))}
                                    className="md:w-1/2 w-full"
                                />
                                <InputError message={errors.discount_value} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="note" className="md:col-span-2 col-span-12">
                                Note
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <Textarea
                                    id="note"
                                    value={data.note}
                                    onChange={(e) => setData("note", e.target.value)}
                                    className="md:w-1/2 w-full"
                                    rows={4}
                                />
                                <InputError message={errors.note} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="footer" className="md:col-span-2 col-span-12">
                                Footer
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2">
                                <Textarea
                                    id="footer"
                                    value={data.footer}
                                    onChange={(e) => setData("footer", e.target.value)}
                                    className="md:w-1/2 w-full"
                                    rows={4}
                                />
                                <InputError message={errors.footer} className="text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 mt-2">
                            <Label htmlFor="attachments" className="md:col-span-2 col-span-12">
                                Attachments
                            </Label>
                            <div className="md:col-span-10 col-span-12 md:mt-0 mt-2 space-y-2">
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="text-left py-2 px-4 font-medium text-gray-700 w-1/3">File Name</th>
                                                <th className="text-left py-2 px-4 font-medium text-gray-700">Attachment</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700 w-24">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attachments.map((item, index) => (
                                                <tr key={`attachment-${index}`} className="border-b last:border-b-0">
                                                    <td className="py-3 px-4">
                                                        <Input
                                                            id={`filename-${index}`}
                                                            type="text"
                                                            placeholder="Enter file name"
                                                            value={item.file_name}
                                                            onChange={(e) => {
                                                                const newAttachments = [...attachments];
                                                                newAttachments[index] = {
                                                                    ...newAttachments[index],
                                                                    file_name: e.target.value
                                                                };
                                                                setAttachments(newAttachments);
                                                            }}
                                                            className="w-full"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Input
                                                            id={`attachment-${index}`}
                                                            type="file"
                                                            onChange={(e) => {
                                                                const newAttachments = [...attachments];
                                                                newAttachments[index] = {
                                                                    ...newAttachments[index],
                                                                    file: e.target.files[0],
                                                                };
                                                                setAttachments(newAttachments);
                                                            }}
                                                            className="w-full"
                                                        />
                                                        {item.file && (
                                                            <div className="text-xs text-gray-500 mt-1 flex items-center justify-between truncate">
                                                                <span className="truncate">
                                                                    {typeof item.file === 'string'
                                                                        ? item.file.split('/').pop()
                                                                        : item.file.name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newAttachments = [...attachments];
                                                                        newAttachments[index] = { ...newAttachments[index], file: null };
                                                                        setAttachments(newAttachments);
                                                                    }}
                                                                    className="ml-2 text-red-500 hover:text-red-700"
                                                                    title="Remove file"
                                                                >
                                                                    <X className="w-6 h-6" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {attachments.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500"
                                                                onClick={() => {
                                                                    const newAttachments = [...attachments];
                                                                    newAttachments.splice(index, 1);
                                                                    setAttachments(newAttachments);
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setAttachments([...attachments, { file_name: "", file: null }]);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Attachment
                                </Button>
                                <InputError message={errors.attachments} className="text-sm" />
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <div className="space-y-2">
                                <div className="text-sm">Subtotal: {calculateSubtotal().toFixed(decimalPlace)}</div>
                                <div className="text-sm">Taxes: {calculateTaxes().toFixed(decimalPlace)}</div>
                                <div className="text-sm">Discount: {calculateDiscount().toFixed(decimalPlace)}</div>
                                {renderTotal()}
                            </div>

                            <div className="space-x-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        reset();
                                        setInvoiceItems([{
                                            product_id: "",
                                            product_name: "",
                                            description: "",
                                            quantity: 1,
                                            unit_cost: 0,
                                        }]);
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    Create Deffered Invoice
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </SidebarInset>
        </AuthenticatedLayout>
    );
}
