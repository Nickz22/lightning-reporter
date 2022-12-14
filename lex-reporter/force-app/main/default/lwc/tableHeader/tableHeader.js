import { LightningElement, api, track } from 'lwc';

export default class TableHeader extends LightningElement {

    @track _columns;

    @api get columns(){
        return this._columns;
    };

    set columns(value){
        let length = 0;

        for(let column of value){
            length++;
        }

        this._columns = value;
        this.cellSize = 3;
    }

}