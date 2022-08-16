import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class TableRow extends NavigationMixin(LightningElement) {
    
    inputTypeBySfSchemaType = new Map(
        [
            ['id', 'text'],
            ['ID', 'datetime'],
            ['string', 'text'],
            ['STRING', 'text'],
            ['date', 'date'],
            ['DATE', 'date'],
            ['DATETIME', 'datetime'],
            ['datetime', 'datetime'],
            ['boolean', 'checkbox'],
            ['BOOLEAN', 'checkbox'],
            ['email', 'email'],
            ['EMAIL', 'email'],
            ['phone', 'tel'],
            ['PHONE', 'tel'],
            ['number', 'number'],
            ['NUMBER', 'number']
        ]
    );

    // {
    //     type: 'standard__app',
    //     attributes: {
    //         appTarget: 'standard__LightningSales',
    //         pageRef: {
    //             type: 'standard__recordPage',
    //             attributes: {
    //                 recordId: '001xx000003DGg0AAG',
    //                 objectApiName: 'Account',
    //                 actionName: 'view'
    //             }
    //         }
    //     }
    // } need to add an onclick event to the row to open the record in a new tab

    @api fields = [];
    @track cells = [];
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
                    'notEditing' : true, // have to make this resolve to `true`...
                                         // cant make read-only show with a `false` boolean value
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

    initEdit(event){
        let clickedFieldName = event.target["dataset"]["id"];
        for(let cell of this.cells){
            let isNotEditing = (
                cell.apiName == clickedFieldName ? 
                !cell.notEditing : // toggle pencil icon
                cell.notEditing
            );
            cell.notEditing = isNotEditing;
        }
    }
}