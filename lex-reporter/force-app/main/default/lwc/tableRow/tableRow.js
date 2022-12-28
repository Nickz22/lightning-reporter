import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveNote from '@salesforce/apex/TableRowController.saveNote';
import countView from '@salesforce/apex/TableRowController.countView';
import runningUserId from '@salesforce/user/Id';
import fetchUsers from '@salesforce/apex/TableRowController.fetchUsers';

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

    @api topMostId;
    @api fields = [];
    rteContent = "";
    isEditMode = false;
    usersPosition = "";
    @track users = [];
    @track avatars = [];
    @track previewAvatar;
    @track notes = [];
    @track cells = [];
    bypassUserFocus = false;
    cellSize;
    sObjectDisplayName;
    isUserSearching = false;
    focusAtEnd = false;
    

    // on render callback
    renderedCallback(){
        // if in edit mode
        if(this.isEditMode){
            // focus on rte
            this.template.querySelectorAll('lightning-input-rich-text')[0].focus();
        }
    }

    handleRteKeyDown(event){
        // when meta + enter is pressed
        if(event.metaKey && event.keyCode === 13){
            this.renderRte();
            saveNote({
                content: event.target.value,
                parentId: this._sObject.record.Id,
                topMostId: this.topMostId
            })
            .then(result => {
                console.log(result.CreatedBy.FullPhotoUrl);
                let currentAvatars = this.avatars;
                currentAvatars.splice(0,0,{
                    "url" : result.CreatedBy.FullPhotoUrl,
                    "name" : result.CreatedBy.Name,
                    "body" : result.Body,
                    "id" : result.Id,
                    "time" : result.CreatedDate
                });
                this.avatars = currentAvatars;
                this.showNotification('Note Saved', '', 'success');
            })
            .catch(error => {
                console.error('error: '+error);
            });
        }

        // when down arrow pressed
        if(event.keyCode === 40){
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
        if(event.keyCode === 27){
            if(this.users.length > 0){
                this.users = [];
                this.isUserSearching = false;
            }else{
                this.renderRte();
            }   
        }
        // if key press is @
        if(event.key === '@' && !this.isUserSearching){
            this.fetchUsers(event);
            this.isUserSearching = true;
        }else if(event.key !== '@' && this.isUserSearching){
            try {
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
                    if(!user.Name.toLowerCase().includes(substring.toLowerCase())){
                        console.log(`hiding ${user.Name}`)
                        user.hidden = true;
                    }else{
                        user.hidden = false;
                    }
                }   
            } catch (error) {
                console.error(error);
            }
        }
    }

    handleUserKeyUp(event){
        console.log('user keydown: '+event.key);
        // if key press is down
        if(event.keyCode === 40){
            event.target.nextSibling.focus();
        }
        // if key press is up
        if(event.keyCode === 38){
            event.target.previousSibling.focus();
        }
        // if key press is enter
        if(event.keyCode === 13){
            this.users = [];
            this.selectLookupUser(event);
            this.isUserSearching = false;
        }
        // if key press is escape
        if(event.keyCode === 27){
            this.users = [];
        }
    }

    selectLookupUser(event){

        let rte = this.template.querySelectorAll('lightning-input-rich-text')[0];
        let userName = event.target.childNodes[0].data;


        let lastAt = rte.value.lastIndexOf('@');
        let lastP = rte.value.lastIndexOf('</p>');
        let substring = rte.value.substring(lastAt+1, lastP);
        let range = rte.value.lastIndexOf(substring);

        rte.value = `${rte.value.substring(0, range).replace("</p>", "")}<strong>${userName}</strong>${rte.value.substring(range+substring.length)}</p>`;
        rte.setRangeText(' ', rte.value.length, rte.value.length, 'end');
    }
        
    @api get updatedSObject(){
        return this._updatedSObject ? this._updatedSObject : this._sObject.record;
    }

    @api get saved(){
        return this._saved;
    }

    set saved(value){
        console.log("handling save");
        let newCells = [];
        for(let cell of this.cells){
            cell.notEditing = true;
            cell.size = 10;
            newCells.push(cell);
        }
        this.cells = newCells;
    }

    @api get sObject(){
        return this._sObject.record;
    }

    set sObject(value){

        try{
            this._sObject = value;
            this.sObjectDisplayName = this._sObject.record.Name.length <= 15 ? 
                                        this._sObject.record.Name :
                                        `${this._sObject.record.Name.substring(0,15)}...`;
            this.cells = this.getTableCellValues();

            if(value.notes){
                this.avatars = [];
                for(let i = 0; i < value.notes.length; i++){
                    let newAvatar = {
                        "url" : value.notes[i].CreatedBy.FullPhotoUrl,
                        "name" : value.notes[i].CreatedBy.Name,
                        "body" : value.notes[i].Body,
                        "id" : value.notes[i].Id,
                        "time" : value.notes[i].CreatedDate,
                        "unreadStyle" : ""
                    };   
                    let views = [];
                    // for each value in value.noteMdByNoteId[value.notes[i].Id], set a `leftStyle` property equal to the value of the index
                    let noteMd = value.noteMdByNoteId[value.notes[i].Id];
                    let mentionedUserIds = new Set();
                    let viewedByUserIds = new Set();
                    if(noteMd){
                        for(let j = 0; j < noteMd.length; j++){
                            if(noteMd[j].Type__c.toLowerCase() === 'mention'){
                                mentionedUserIds.add(noteMd[j].Mentioned_User__c);
                            }else if(noteMd[j].Type__c.toLowerCase() === 'view'){
                                let view = {};
                                for(let param in noteMd[j]){ // noteMd[j] is read-only
                                    view[param] = noteMd[j][param];
                                }
                                view.leftStyle = 'left: '+j+'em;';
                                views.push(view);
                                viewedByUserIds.add(noteMd[j].Viewed_By__c);
                            }
                        }
                    }
                    newAvatar.views = views;
                    if(mentionedUserIds.has(runningUserId) && !viewedByUserIds.has(runningUserId)){
                        // make newAvatar.unreadStyle an orange border
                        newAvatar.unreadStyle = 'border: 2px solid #ff8c00;'
                    }
                    this.avatars.push(newAvatar);
                }
            }

            if(this.avatars.length > 0){
                console.log('setting avatars');
                this.previewAvatar = this.avatars[0];
                if(this.notes.length > 0){
                    this.notes = this.avatars
                }
            }else{
                this.previewAvatar = {
                    "url" : "",
                    "name" : "",
                    "body" : "",
                    "id" : "",
                    "time" : "",
                    "unreadStyle" : ""
                };
            }

            this.cellSize = 3;
        }catch(e){
            console.error(e);
        }

        
    }

    getTableCellValues = () => {
        let cells = [];
        let baseUrl = window.location.href.substring(0, window.location.href.indexOf(".com/")+5);
        for(let field of this.fields){
            let isRef = (field.type === 'Id' || field.type === 'ID' || field.type === 'REFERENCE' || field.type === 'reference');
            cells.push(
                {
                    'apiName': field.name, 
                    'label' : field.label,
                    'value': this._sObject.record[field.name],
                    'isUpdateable' : field.isUpdateable,
                    'isReference' : isRef,
                    'url' : isRef ? baseUrl+this._sObject.record[field.name] : '',
                    'notEditing' : true, // have to make this resolve to `true`...
                                         // cant make read-only show with a `false` boolean value
                    'type' : this.inputTypeBySfSchemaType.get(field.type),
                }
            );
        }

        // log cell urls
        for(let cell of cells){
            console.log(cell.url);
        }

        return cells;
    }

    handleValueChange(event){
        try{

            let clone = {};

            for(let field in this._sObject.record){
                clone[field] = this._sObject.record[field];
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
        this.dispatchEvent(new CustomEvent('edit', {
            detail: {
                'sObject' : this._sObject,
                'updatedSObject' : this._updatedSObject
            },
            composed: true,
            bubbles: true
        }));
        let clickedFieldName = event.target.dataset.id;
        for(let cell of this.cells){
            let isNotEditing = (
                cell.apiName === clickedFieldName ? 
                !cell.notEditing : // toggle pencil icon
                cell.notEditing
            );
            cell.notEditing = isNotEditing;
            cell.size = 12;
        }
    }

    renderRte(){
        this.isEditMode = !this.isEditMode;
    }

    fetchUsers(event){
        console.log('fetching users');
        fetchUsers()
            .then(result => {
                for(let i = 0; i < result.length; i++){
                    let user = {};
                    for(let param in result[i]){
                        user[param] = result[i][param];
                    }
                    user.hidden = false;
                    this.users.push(user);
                }
                this.usersPosition = 'top: ' + (event.target.getBoundingClientRect().top + 200) + '; left: ' + event.target.getBoundingClientRect().left + ';';
            })
            .catch(error => {
                this.showNotification('Error', error.body.message, 'error');
            });
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
        this.previewAvatar.unreadStyle = "";
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

    countNoteView(event){
        countView({
            noteMetadata: {
                NoteId: event.target.dataset.id, 
                NoteParentId: this._sObject.record.Id, 
                ViewedById: runningUserId
            }
        }).catch(error => {
            console.error(error);
        });
    }
}