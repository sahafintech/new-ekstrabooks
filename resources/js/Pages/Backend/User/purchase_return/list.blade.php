<x-app-layout>
    <!-- Start::main-content -->
    <div class="main-content">
        <x-page-header title="Purchase Returns" page="user" subpage="list" />

        <div class="grid grid-cols-12">
            <div class="col-span-12">
                <div class="box">
                    <div class="box-header flex items-center justify-between">
                        <h5>{{ _lang('Purchase Returns') }}</h5>
                        <a href="{{ route('purchase_returns.create') }}">
                            <x-primary-button>
                                <i class="ri-add-line mr-1"></i>
                                {{ _lang('Add New Return') }}
                            </x-primary-button>
                        </a>
                    </div>
                    <div class="box-body">
                        <div class="grid grid-cols-12 gap-x-6">
                            <div class="lg:col-span-3 col-span-12 mb-2">
                                <select class="w-full selectize" multiple name="status">
                                    <option value="">{{ _lang('Select an option') }}</option>
                                    <option value="0">{{ _lang('All Statuses') }}</option>
                                    <option value="1">{{ _lang('Active') }}</option>
                                    <option value="2">{{ _lang('Refund') }}</option>
                                </select>
                            </div>
                        </div>
                        <div class="table-bordered rounded-sm ti-custom-table-head overflow-auto mt-3">
                            <table id="datatable" class="ti-custom-table ti-custom-table-head whitespace-nowrap">
                                <thead>
                                    <tr>
                                        <th>{{ _lang('Date') }}</th>
                                        <th>{{ _lang('Return Number') }}</th>
                                        <th>{{ _lang('Vendor') }}</th>
                                        <th class="text-right">{{ _lang('Grand Total') }}</th>
                                        <th class="text-right">{{ _lang('Due Amount') }}</th>
                                        <th class="text-center">{{ _lang('Status') }}</th>
                                        <th class="text-center">{{ _lang('Action') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($purchaseReturns as $return)
                                    <tr data-id="row_{{ $return->id }}">
                                        <td>{{ $return->return_date }}</td>
                                        <td>{{ $return->return_number }}</td>
                                        <td>{{ $return->vendor->name }}</td>
                                        <td>
                                            {{ formatAmount($return->grand_total, currency_symbol(request()->activeBusiness->currency), $return->business_id) }}
                                            @if($return->grand_total != $return->converted_total)
                                            ({{ formatAmount($return->converted_total, currency_symbol($return->currency), $return->business_id) }})
                                            @endif
                                        </td>
                                        <td>
                                            {{ formatAmount($return->grand_total - $return->paid, currency_symbol(request()->activeBusiness->currency), $return->business_id) }}
                                            @if($return->grand_total != $return->converted_total)
                                            ({{ formatAmount((($return->grand_total - $return->paid) * $return->exchange_rate), currency_symbol($return->currency), $return->business_id) }})
                                            @endif
                                        </td>
                                        <td>
                                            @if($return->status == '0')
                                            <span class="text-primary">{{ _lang('Active') }}</span>
                                            @elseif($return->status == 1)
                                            <span class="text-success">{{ _lang('Refund') }}</span>
                                            @else
                                            <span class="text-secondary">{{ _lang('Partially Refund') }}</span>
                                            @endif
                                        </td>
                                        <td class="text-center">
                                            <div class="hs-dropdown ti-dropdown">
                                                <button id="hs-dropdown-with-icons" type="button" class="hs-dropdown-toggle ti-dropdown-toggle">
                                                    Actions
                                                    <svg class="hs-dropdown-open:rotate-180 ti-dropdown-caret" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2 5L8.16086 10.6869C8.35239 10.8637 8.64761 10.8637 8.83914 10.6869L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                                                    </svg>
                                                </button>

                                                <div class="hs-dropdown-menu ti-dropdown-menu divide-y divide-gray-200" aria-labelledby="hs-dropdown-with-icons">
                                                    <div class="ti-dropdown-divider">
                                                        @if($return->status == 0)
                                                        <a class="ti-dropdown-item" href="{{ route('purchase_returns.edit', $return['id']) }}">
                                                            <i class="ri-edit-box-line text-lg"></i>
                                                            Edit
                                                        </a>
                                                        @endif
                                                        <a class="ti-dropdown-item" href="{{ route('purchase_returns.show', $return['id']) }}">
                                                            <i class="ri-eye-line text-lg"></i>
                                                            View
                                                        </a>
                                                        @if($return->status == 0 || $return->status == 2)
                                                        <a class="ti-dropdown-item ajax-modal" href="{{ route('purchase_returns.refund', $return['id']) }}" data-hs-overlay="#refund-modal">
                                                            <i class="ri-hand-coin-line text-lg"></i>
                                                            Refund
                                                        </a>
                                                        @endif
                                                        <a class="ti-dropdown-item" href="javascript:void(0);" data-hs-overlay="#delete-modal" data-id="{{ $return['id'] }}" id="delete">
                                                            <i class="ri-delete-bin-line text-lg"></i>
                                                            Delete
                                                            </form>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="refund-modal" class="hs-overlay hidden ti-modal">
            <div class="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-4xl lg:w-full m-3 lg:!mx-auto">
                <div class="ti-modal-content">
                    <div class="ti-modal-body hidden" id="modal_spinner">
                        <div class="text-center spinner">
                            <div class="ti-spinner text-primary" role="status" aria-label="loading"> <span class="sr-only">Loading...</span> </div>
                        </div>
                    </div>
                    <div id="main-modal">

                    </div>
                </div>
            </div>
        </div>
        <x-modal>
            <form method="post">
                {{ csrf_field() }}
                <input name="_method" type="hidden" value="DELETE">
                <div class="ti-modal-header">
                    <h3 class="ti-modal-title">
                        Delete Modal
                    </h3>
                    <button type="button" class="hs-dropdown-toggle ti-modal-close-btn" data-hs-overlay="#delete-modal">
                        <span class="sr-only">Close</span>
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>
                <div class="ti-modal-body">

                    <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {{ __('Are you sure you want to delete the purchase return?') }}
                    </h2>

                </div>
                <div class="ti-modal-footer">
                    <x-secondary-button data-hs-overlay="#delete-modal">
                        {{ __('Cancel') }}
                    </x-secondary-button>

                    <x-danger-button class="ml-3 submit-btn" type="submit">
                        {{ __('Delete Purchase Return') }}
                    </x-danger-button>
                </div>
            </form>
        </x-modal>
    </div>
</x-app-layout>

<script>
    $(document).on('click', '#delete', function() {
        var id = $(this).data('id');
        $('#delete-modal form').attr('action', '/user/purchase_returns/' + id);
    });
</script>