import { LightningElement, api, track } from "lwc";

export default class FilterInput extends LightningElement {
  @api filterId;
  @api dummy;
  @api type;
  @api fieldOptions;
  @api operatorOptions;
  @api mode;
  @api isSaved = false;

  @track _field;
  @api
  get field() {
    return this._field;
  }
  set field(value) {
    this._field = value;
  }

  @track _operator;
  @api
  get operator() {
    return this._operator;
  }
  set operator(value) {
    this._operator = value;
  }

  @track _value;
  @api
  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
  }

  handleFieldChange(event) {
    debugger;
    this._field = event.detail.value;
    let fieldOption = this.fieldOptions.find(
      (option) => option.value === this._field
    );
    this.dispatchEvent(
      new CustomEvent("fieldchange", {
        detail: {
          id: this.filterId,
          value: fieldOption
        }
      })
    );
  }

  handleOperatorChange(event) {
    debugger;
    this._operator = event.detail.value;
    let operator = this.operatorOptions.find(
      (option) => option.value === this._operator
    );
    this.dispatchEvent(
      new CustomEvent("operatorchange", {
        detail: {
          id: this.filterId,
          value: operator.value
        }
      })
    );
  }

  handleValueChange(event) {
    debugger;
    this._value = event.detail.value;
    this.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: { id: this.filterId, value: this._value }
      })
    );
  }
}
