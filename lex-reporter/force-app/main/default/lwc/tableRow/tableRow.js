import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveNote from '@salesforce/apex/TableRowController.saveNote';
import countView from '@salesforce/apex/TableRowController.countView';
import runningUserId from '@salesforce/user/Id';

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
    isEditMode = false;
    @track avatars = [];
    @track previewAvatar;
    @track notes = [];
    @track cells = [];
    
    // on render callback
    renderedCallback(){
        // if in edit mode
        if(this.isEditMode){
            // focus on rte
            this.template.querySelectorAll('lightning-input-rich-text')[0].focus();
        }
    }

    handleRteKeyUp(event){
        // if key press is escape
        if(event.detail === 27){
            this.renderRte();
        }
    }

    saveNote(event){
        console.log(`saveNote in tableRow`);
        this.renderRte();
        saveNote({
            content: event.detail,
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
        
    @api get updatedSObject(){
        return this._updatedSObject ? this._updatedSObject : this._sObject.record;
    }

    @api get saved(){
        return this._saved;
    }

    set saved(value){
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
        try {
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
                            views.push({
                                ...noteDto.views[j],
                                leftStyle : 'left: '+j+'em;'
                            });
                        }
                    }
                    newAvatar.views = views;
                    this.avatars.push(newAvatar);
                }
            }

            if(this.avatars.length > 0){
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
        } catch (error) {
            this.showNotification('Error', error.message, 'error');
        }
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
                            isRef ? this._sObject.record[refLabelPath]?.Name : ''; 
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

        return cells;
    }

    handleValueChange(event){
        try{

            let clone = {...this._sObject.record};
            let input = event.target;
            let fieldName = input.dataset.id;
            clone[fieldName] = input.value;
            this._updatedSObject = clone;
        }catch(e){
            console.error(e);
        }
    }

    initEdit(event){
        console.log('initEdit');
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
            metadata: {
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