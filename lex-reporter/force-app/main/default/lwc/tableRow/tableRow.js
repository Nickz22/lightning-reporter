import { LightningElement, api } from 'lwc';

export default class TableRow extends LightningElement {
    
    @api fields = [];
    cells = [];
    cellSize;

    @api get updatedSObject(){
        return this._updatedSObject ? this._updatedSObject : this._sObject;
    }

    @api get sObject(){
        return this._sObject;
    }

    set sObject(value){
        this._sObject = value;
        let i = 0;
        this.cells = [];
        let fieldByName = new Map(
            this.fields.map(field => [field.name, field])
        );
        
        for(let prop in this._sObject){
            i++
            this.cells.push(
                {
                    'apiName': prop, 
                    'value': this._sObject[prop], 
                    'isUpdateable' : (
                        fieldByName.has(prop) ? 
                        fieldByName.get(prop).isUpdateable : 
                        fieldByName.get(prop.toLowerCase()).isUpdateable
                    )
                }
            );
        }
        this.cellSize = Math.floor(12/i);
    }

    handleValueChange(event){
        try{

            let clone = {};

            for(let prop in this._sObject){
                clone[prop] = this._sObject[prop];
            }

            let f = event.target["dataset"]["id"];
            let v = event.target.value;
            clone[f] = v;
            this._updatedSObject = clone;
        }catch(e){
            console.error(e);
        }
    }
}