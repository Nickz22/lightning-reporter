import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveNote from '@salesforce/apex/TableRowController.saveNote';

export default class TableRow extends NavigationMixin(LightningElement) {

    inputTypeBySfSchemaType = new Map([
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
    ]);

    @api fields = [];
    rteContent = "";
    isEditMode = false;
    usersPosition = "";
    @track users = [];
    @track avatars = [];
    @track notes = [];
    @track cells = [];
    bypassUserFocus = false;
    cellSize;
    sObjectName;
    isUserSearching = false;
    focusAtEnd = false;

    handleRteKeyDown(event){
        // when meta + enter is pressed
        if(event.metaKey && event.keyCode == 13){
            this.renderRte();
            saveNote({
                content: event.target.value,
                parentId: this._sObject.Id
            })
            .then(result => {
                console.log(result.CreatedBy.FullPhotoUrl);
                let currentAvatars = this.avatars;
                currentAvatars.push({
                    "url" : result.CreatedBy.FullPhotoUrl,
                    "name" : result.CreatedBy.Name,
                    "body" : result.Body,
                    "id" : result.Id
                });
                this.avatars = currentAvatars;
                this.showNotification('Note Saved', '', 'success');
            })
            .catch(error => {
                console.log('error: '+error);
            });
        }

        // when down arrow pressed
        if(event.keyCode == 40){
            let users = this.template.querySelectorAll('.lookup-user');
            if(users.length > 0){
                console.log('focusing on first user');
                users[0].focus();
            }
        }
    }

    handleRteKeyUp(event){
        console.log('rte keyup: '+event.key);
        console.log('rte keyup code: '+event.keyCode);
        // if key press is escape
        if(event.keyCode == 27){
            if(this.users.length > 0){
                this.users = [];
                this.isUserSearching = false;
            }else{
                this.renderRte();
            }   
        }
        // if key press is @
        if(event.key == '@' && !this.isUserSearching){
            this.getUserList(event);
            this.isUserSearching = true;
        }else if(event.key != '@' && this.isUserSearching){
            console.log(event.target.value);
            // find substring between last "@" and last "</p>"
            let lastAt = event.target.value.lastIndexOf('@');
            let lastP = event.target.value.lastIndexOf('</p>');
            let substring = event.target.value.substring(lastAt+1, lastP);
            console.log(`searching users for: ${substring}`);
            // filter users by name
            for(let user of this.users){
                if(!substring){
                    user.hidden = false;
                }
                if(!user.name.toLowerCase().includes(substring.toLowerCase())){
                    console.log(`hiding ${user.name}`)
                    user.hidden = true;
                }else{
                    user.hidden = false;
                }
            }
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
            this.isUserSearching = false;
        }
        // if key press is escape
        if(event.keyCode == 27){
            this.users = [];
        }
    }

    selectLookupUser(event){

        let rte = this.template.querySelectorAll('lightning-input-rich-text')[0];
        let userName = event.target.childNodes[0].data;

        // set range text from last instance of "@" to end of rte value
        let lastAt = rte.value.lastIndexOf('@');
        let lastP = rte.value.lastIndexOf('</p>');
        let substring = rte.value.substring(lastAt+1, lastP);
        let range = rte.value.lastIndexOf(substring);
        console.log("printing first half of string "+rte.value.substring(0, range));
        rte.value = `${rte.value.substring(0, range)}<strong>${userName}</strong>${rte.value.substring(range+substring.length)}`;
        rte.setRangeText(' ', rte.value.length, rte.value.length, 'end');
    }
        
    @api get updatedSObject(){
        return this._updatedSObject ? this._updatedSObject : this._sObject;
    }

    @api get sObject(){
        return this._sObject;
    }

    set sObject(value){

        this._sObject = value;
        this.sObjectName = this._sObject.Name;
        this.cells = this.getTableCellValues();

        if(value.Notes){
            this.avatars = [];
            for(let i = 0; i < value.Notes.length; i++){
                let newAvatar = {
                    "url" : value.Notes[i].CreatedBy.FullPhotoUrl,
                    "name" : value.Notes[i].CreatedBy.Name,
                    "body" : value.Notes[i].Body,
                    "id" : value.Notes[i].Id,
                    "time" : value.Notes[i].CreatedDate
                };
                this.avatars.push(newAvatar);
            }
        }
        this.cellSize = 3;
    }

    getTableCellValues = () => {
        let cells = [];
        
        for(let field of this.fields){
            cells.push(
                {
                    'apiName': field.name, 
                    'label' : field.label,
                    'value': this._sObject[field.name],
                    'isUpdateable' : field.isUpdateable,
                    'isReference' : (field.type === 'Id' || field.type === 'ID' || field.type === 'REFERENCE' || field.type === 'reference'),
                    'notEditing' : true, // have to make this resolve to `true`...
                                         // cant make read-only show with a `false` boolean value
                    'type' : this.inputTypeBySfSchemaType.get(field.type),
                }
            );
        }

        return cells;
    }

    handleValueChange(event){
        try{

            let clone = {};

            for(let field in this._sObject){
                clone[field] = this._sObject[field];
            }

            let input = event.target;
            let fieldName = input.dataset.id;
            clone[fieldName] = input.value;
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

    toggleRowComments(){
        if(this.notes.length > 0){
            this.notes = [];  
            // set table row class to table-row-expanded
            let tableRow = this.template.querySelector('.table-row');
            tableRow.classList.remove('table-row-expanded');    
        }else{
            this.notes = this.avatars;
            // set table row class to table-row-expanded
            let tableRow = this.template.querySelector('.table-row');
            tableRow.classList.add('table-row-expanded');
        }
    }
}