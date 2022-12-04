import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TableRow extends NavigationMixin(LightningElement) {

    rteContent = "";
    isEditMode = false;
    usersPosition = "";
    @track users = [];
    bypassUserFocus = false;
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

    @api fields = [];
    @track cells = [];
    cellSize;
    sObjectName;

    renderedCallback(){
        let users = this.template.querySelectorAll('.lookup-user');
        if(users.length > 0 && !this.bypassUserFocus){
            console.log('focusing on first user');
            users[0].focus();
        }
        if(this.bypassUserFocus){
            this.bypassUserFocus = false;
        }
    }

    handleRteKeyDown(event){
        console.log('rte keydown: '+event.key);
        // when meta + enter is pressed
        if(event.metaKey && event.keyCode == 13){
            this.showNotification('Note Saved', '', 'success');
            this.renderRte();
        }
    }

    handleRteKeyUp(event){
        console.log('rte keyup: '+event.key);
        console.log('rte keyup code: '+event.keyCode);
        // if key press is escape
        if(event.keyCode == 27){
            if(this.users.length > 0){
                this.users = [];
            }else{
                this.renderRte();
            }   
        }
        // if key press is @
        if(event.key == '@'){
            this.getUserList(event);
        }
    }

    handleUserKeyUp(event){
        console.log('user keydown: '+event.key);
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
            this.users = [];
            this.selectLookupUser(event);
        }
        // if key press is escape
        if(event.keyCode == 27){
            this.users = [];
        }
    }

    selectLookupUser(event){

        let rte = this.template.querySelectorAll('lightning-input-rich-text')[0];
        let userName = event.target.childNodes[0].data;
        console.log(userName);
        rte.setRangeText(
            userName, 
            undefined, 
            undefined,
            'select'
        );
        // this.bypassUserFocus = true;
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
        this.cellSize = Math.floor(11/i);
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

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }
}