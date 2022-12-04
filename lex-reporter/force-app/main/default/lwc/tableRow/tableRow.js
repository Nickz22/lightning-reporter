import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class TableRow extends NavigationMixin(LightningElement) {

    rteContent = "";
    isEditMode = false;
    usersPosition = "";
    users = [];
    
    inputTypeBySfSchemaType = new Map(
        [
            ['id', 'text'],
            ['ID', 'text'],
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
    sObjectName;

    renderedCallback(){
        let users = this.template.querySelectorAll('.lookup-user');
        if(users.length > 0){
            users[0].focus();
        }
    }

    handleUserKeydown(event){
        // if key press is down
        if(event.keyCode == 40){
            event.target.nextSibling.focus();
        }
        // if key press is up
        if(event.keyCode == 38){
            event.target.previousSibling.focus();
        }
        // if key press is enter
        if(event.keyCode == 13){
            this.selectLookupUser(event);
        }
    }
        
    @api get updatedSObject(){
        return this._updatedSObject ? this._updatedSObject : this._sObject;
    }

    @api get sObject(){
        return this._sObject;
    }

    set sObject(value){

        this._sObject = value;
        this.sObjectName = this._sObject["Name"];
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
                    'isReference' : (field.type == 'Id' || field.type == 'ID' || field.type == 'REFERENCE' || field.type == 'reference'),
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

    renderRte(){
        this.isEditMode = !this.isEditMode;
    }

    async rteChange(event){
        if(event.target.value.includes('@')){
            this.getUserList(event);
        }
    }

    getUserList(event){
        console.log('getting user list');
        let x = {
            0 : "Cornelius Rex",
            1 : "Albert Einstein",
            2 : "Maximilion Herman Rosegrant",
            3 : "Aldous Huxley-Freud",
            4 : "Steven Solomon",
        }

        this.usersPosition = 'top: ' + (event.target.getBoundingClientRect().top + 200) + '; left: ' + event.target.getBoundingClientRect().left + ';';
        for(let i = 0; i<5; i++){
            this.users.push(
                {name: x[i], id:x[i]}
            );
        }
    }

    selectLookupUser(event){

        let rte = this.template.querySelectorAll('lightning-input-rich-text')[0];
        let userName = event.target.childNodes[0].data;
        console.dir(event.target)
        console.log(userName);
        rte.setRangeText(
            userName, 
            undefined, 
            undefined,
            'select'
        );
    }
}