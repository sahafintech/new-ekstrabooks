<?php

namespace App\Models;

use App\Traits\MultiTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class SalaryBenefit extends Model
{
    use MultiTenant;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'salary_benefits';

    protected $fillable = ['salary_scale_id', 'employee_benefit_id', 'date', 'description', 'amount', 'type', 'account_id'];

    protected function amount(): Attribute{
        $decimal_place = get_business_option('decimal_places', 2);

        return Attribute::make(
            get: fn($value) => number_format($value, $decimal_place, '.', ''),
        );
    }
    
    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id');
    }
    
    public function employee_benefit()
    {
        return $this->belongsTo(EmployeeBenefit::class, 'employee_benefit_id');
    }
}