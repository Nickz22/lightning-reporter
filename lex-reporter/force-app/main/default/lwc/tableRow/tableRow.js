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
            .then(noteDTO => {
                let currentAvatars = this.avatars;
                currentAvatars.splice(0,0,{
                    "url" : noteDTO.note.CreatedBy.FullPhotoUrl,
                    "name" : noteDTO.note.CreatedBy.Name,
                    "body" : noteDTO.note.Body,
                    "id" : noteDTO.note.Id,
                    "time" : noteDTO.localCreatedDate
                });
                this.avatars = currentAvatars;
                this.showNotification('Note Saved', '', 'success');
            })
            .catch(error => {
                throw error;
            });
        }

        // when down arrow pressed
        if(event.keyCode === 40){
            let users = this.template.querySelectorAll('.lookup-user');
            if(users.length > 0){
                users[0].focus();
            }
        }

        if(event.keyCode === 13 && this.isUserSearching){
            let users = this.template.querySelectorAll('.lookup-user');
            if(users.length === 1){
                this.selectLookupUser(users[0].textContent)
            }
        }
    }

    handleRteKeyUp(event){
        // if key press is escape
        if(event.keyCode === 27){
            if(this.users.length > 0){
                this.users = [];
            }else{
                this.renderRte();
            }   
            this.isUserSearching = false;
        }
        // if key press is @
        if(event.key === '@' && !this.isUserSearching){
            this.fetchUsers(event);
            this.isUserSearching = true;
        }else if(event.key !== '@' && event.keyCode !== 13 && this.isUserSearching){ // if key press is not @ or enter
            try {
                // find substring between last "@" and last "</p>"
                let lastAt = event.target.value.lastIndexOf('@');
                let lastP = event.target.value.lastIndexOf('</p>');
                let substring = event.target.value.substring(lastAt+1, lastP);
                // filter users by name
                for(let user of this.users){
                    if(!substring){
                        user.hidden = false;
                    }
                    if(!user.Name.toLowerCase().includes(substring.toLowerCase())){
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

    fetchUsers(){
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
            })
            .catch(error => {
                this.showNotification('Error', error.body.message, 'error');
            });
    }

    handleUserSelect(event){
        console.dir(event.target.childNodes[1]);
        this.selectLookupUser(event.target.childNodes[1].textContent);
    }

    selectLookupUser(userName){

        let rte = this.template.querySelectorAll('lightning-input-rich-text')[0];
        let lastAt = rte.value.lastIndexOf('@');
        let lastP = rte.value.lastIndexOf('</p>');
        let substring = rte.value.substring(lastAt+1, lastP);
        let range = rte.value.lastIndexOf(substring);

        let firstMsgSegment = rte.value.substring(0, range).replace("</p>", "");
        let secondMsgSegment = rte.value.substring(range+substring.length);

        rte.value = `${firstMsgSegment}<strong>${userName}</strong>${secondMsgSegment}`;
        rte.setRangeText('', rte.value.length, rte.value.length, 'end');
        rte.setFormat({bold: false});
        this.isUserSearching = false;
        this.users = [];
    }

    handleUserKeyUp(event){
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
            this.handleUserSelect(event);
        }
        // if key press is escape
        if(event.keyCode === 27){
            this.users = [];
        }
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
        debugger;
        this._sObject = value;
        this.cells = this.getTableCellValues();
        let hasAlert = false;
        if(value.notes){
            this.avatars = [];
            for(let i = 0; i < value.notes.length; i++){
                let noteDto = value.notes[i];
                hasAlert = noteDto.alertRunningUser ? true : hasAlert;
                let newAvatar = {
                    "url" : noteDto.note.CreatedBy.FullPhotoUrl,
                    "name" : noteDto.note.CreatedBy.Name,
                    "body" : noteDto.note.Body,
                    "id" : noteDto.note.Id,
                    "time" : new Date(noteDto.localCreatedDate)
                };   
                let views = [];
                // for each value in value.noteMdByNoteId[value.notes[i].Id], set a `leftStyle` property equal to the value of the index
                if(noteDto.views){
                    for(let j = 0; j < noteDto.views.length; j++){
                        let view = {};
                        for(let param in noteDto.views[j]){ // noteMd[j] is read-only
                            view[param] = noteDto.views[j][param];
                        }
                        view.leftStyle = 'left: '+j+'em;';
                        views.push(view);
                    }
                }
                newAvatar.views = views;
                this.avatars.push(newAvatar);
            }
        }

        if(this.avatars.length > 0){
            console.log('setting avatars');
            this.previewAvatar = this.avatars[0];
            this.previewAvatar.unreadStyle = hasAlert ? "border: 2px solid #00ff00;" : "";
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
    }

    getTableCellValues = () => {
        let cells = [];
        let baseUrl = window.location.href.substring(0, window.location.href.indexOf(".com/")+5);
        for(let field of this.fields){
            let isRef = field.type.toLowerCase() === 'reference';
            let isId = field.type.toLowerCase() === 'id';
            let refLabelPath = isId ? 'Name' : 
                                isRef ? field.isCustom ? field.name.replace('__c', '__r') : field.name.replace('Id', '') : ''; 
            let refLabel = isId ? this._sObject.record[refLabelPath] : 
                            isRef ? this._sObject.record[refLabelPath].Name : ''; 
            cells.push(
                {
                    'apiName': field.name, 
                    'label' : (isRef || isId) && refLabel > 15 ? refLabel.substring(0,15)+'...' : 
                                (isRef || isId) ? refLabel : field.label,
                    'value': this._sObject.record[field.name],
                    'isUpdateable' : field.isUpdateable,
                    'isReference' : isRef || isId,
                    'url' : isRef || isId ? baseUrl+this._sObject.record[field.name] : '',
                    'notEditing' : true, // have to make this resolve to `true`...
                                         // cant make read-only show with a `false` boolean value
                    'type' : this.inputTypeBySfSchemaType.get(field.type),
                    'isDatetime' : this.inputTypeBySfSchemaType.get(field.type) === 'datetime',
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
            let isNotEditing = cell.apiName !== clickedFieldName 
            cell.notEditing = isNotEditing;
            cell.size = 12;
        }
    }

    renderRte(){
        this.isEditMode = !this.isEditMode;
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

        try {
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
        } catch (error) {
            this.showNotification('Error', error.message, 'error');
        }
    }

    countNoteView(event){
        countView({
            noteMetadata: {
                NoteId: event.target.dataset.id, 
                NoteParentId: this._sObject.record.Id, 
                ViewedById: runningUserId,
                TopMostId: this.topMostId
            }
        }).catch(error => {
            console.error(error);
        });
    }
}