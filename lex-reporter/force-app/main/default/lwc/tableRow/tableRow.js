import { LightningElement, api } from 'lwc';

export default class TableRow extends LightningElement {
    
    cellValues = [];
    cellSize;

    @api get sObject(){
        return this._sObject;
    }

    set sObject(value){
        this._sObject = value;
        let i = 0;
        this.cellValues = [];
        
        for(let prop in this._sObject){
            i++
            this.cellValues.push(this._sObject[prop]);
        }
        this.cellSize = Math.floor(12/i);
    }
}