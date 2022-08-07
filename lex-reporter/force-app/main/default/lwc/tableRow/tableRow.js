import { LightningElement, api } from 'lwc';

export default class TableRow extends LightningElement {
    
    inputTypeBySfSchemaType = new Map(
        [
            ['id', 'text'],
            ['string', 'text'],
            ['date', 'date'],
            ['datetime', 'datetime'],
            ['boolean', 'checkbox'],
            ['email', 'email'],
            ['phone', 'tel'],
            ['number', 'number']
        ]
    );

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
        
        for(let field of this.fields){
            i++
            this.cells.push(
                {
                    'apiName': field.name, 
                    'label' : field.label,
                    'value': this._sObject[field.name], 
                    'isUpdateable' : field.isUpdateable,
                    'type' : this.inputTypeBySfSchemaType.get(field.type),
                }
            );
        }
        this.cellSize = Math.floor(12/i);
    }

    handleValueChange(event){
        try{

            let clone = {};

            for(let field in this._sObject){
                clone[field] = this._sObject[field];
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