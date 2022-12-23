import { LightningElement, api } from 'lwc';

export default class Table extends LightningElement {
    @api selectedFields;
    @api childRecords;
    @api saved;

    @api getRows(){
        return this.template.querySelectorAll('c-table-row');
    }
}