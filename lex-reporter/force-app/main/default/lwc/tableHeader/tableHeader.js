import { LightningElement, api, track } from 'lwc';

export default class TableHeader extends LightningElement {

    @track _columns;

    @api get columns(){
        return this._columns;
    };

    set columns(value){
        this._columns = value;
        console.log('set columns: '+JSON.stringify(this._columns));
        this.cellSize = Math.floor(12/this._columns.length);
    }

}