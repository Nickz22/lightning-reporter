import { LightningElement, api, wire, track } from 'lwc';
import getChildTypes from '@salesforce/apex/LightningReporterController.getChildTypes';
import getRecordsFromTypeLookingUpToId from '@salesforce/apex/LightningReporterController.getRecordsFromTypeLookingUpToId'
import getFieldsFromType from '@salesforce/apex/LightningReporterController.getFieldsFromType'
import saveRecords from '@salesforce/apex/LightningReporterController.saveRecords'
import pinLayout from '@salesforce/apex/LightningReporterController.pinLayout'
import getPinnedViews from '@salesforce/apex/LightningReporterController.getPinnedViews';
import deletePin from '@salesforce/apex/LightningReporterController.deletePin';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class LightningReporter extends LightningElement {
    @api recordId;
    @track childRecords;
    @track selectedFields;
    @track pinnedViews = [];
    selectableFields;
    selectableFieldByName = new Map();
    childTypes;
    saved = false;
    selectedType;
    polling = false;
    isEditingRow = false;

    renderedCallback(){
        if(!this.polling){
            this.polling = true;
            setInterval(() => {
                try {
                    if(this.isEditingRow || this.childRecords.length === 0){ 
                        return; 
                    }
                    this.getChildRecords();   
                } catch (error) {
                    this.showNotification('Error', error.body.message, 'error');
                }
            }, 10000);
        }
    }

    @wire (getChildTypes, {recordId : '$recordId'})
    getRecordsFromDefaultChildType({error, data}){
        if(error){
            console.error('error getting default child records: '+error)
            return;
        }
        if(data){
            this.childTypes = data;
            this.selectedType = this.childTypes[0];
            this.getPinnedViews();
        }else{
            console.error('no data returned from getChildTypes');
        }
    }

    get options() {
        let options = [];
        
        if(!this.childTypes){
            return options;
        }

        for(let i=0; i<this.childTypes.length; i++){
            options.push(
                {
                    label: this.childTypes[i], 
                    value: this.childTypes[i]
                }
            );
        }

        return options;
    }

    getChildRecords(){
        // this setup needs to be done for every fetch
        if(!this.selectableFields){
            this.getSelectableFields();
        }else{
            this.getRecords();
        }
    }

    getRecords(){
        getRecordsFromTypeLookingUpToId({
            typeName: this.selectedType,
            parentId: this.recordId,
            fieldsToGet: this.selectedFields
        })
            .then(result => {
                for(let i=0; i<result.length; i++){
                    result[i].record.sObjectType = this.selectedType;
                }
                this.childRecords = result;
            }).catch(error => {
                throw error;
            })
    }

    getPinnedViews(){
        getPinnedViews()
            .then(result => {
                this.pinnedViews = result;
                if(this.pinnedViews.length > 0){
                    this.selectedType = this.pinnedViews[0].objectName;
                    this.selectedFields = this.pinnedViews[0].defaultFields;
                    this.selectableFields = this.pinnedViews[0].defaultFields;
                    this.getChildRecords();
                }else{
                    this.selectedType = null;
                    this.selectedFields = [];
                    this.selectableFields = [];
                    this.childRecords = [];
                }
            }).catch(error => {
                throw error;
            })
    }

    setView(event){
        try {
            this.selectedType = event.target.dataset.id;
            this.selectedFields = [];
            // get pinned view matching selected type
            let pinnedView = this.pinnedViews.find(view => view.objectName === this.selectedType);
            this.selectedFields = pinnedView.defaultFields;
            this.selectableFields = pinnedView.defaultFields;
            this.getChildRecords();
        } catch (error) {
            this.showNotification('Error', error.body.message, 'error');
        }
    }

    removePin(event){
        event.preventDefault();
        let pinnedViews = this.pinnedViews;
        for(let i=0; i<pinnedViews.length; i++){
            if(pinnedViews[i].objectName === event.target.dataset.id){
                pinnedViews.splice(i, 1);
                break;
            }
        }

        this.pinnedViews = pinnedViews;

        if(this.pinnedViews.length === 0){
            this.selectedType = null;
            this.childRecords = [];
            this.selectableFields = [];
            this.selectedFields = [];
        }else{
            this.selectedType = this.pinnedViews[0].objectName;
            this.selectedFields = this.pinnedViews[0].defaultFields;
            this.selectableFields = this.pinnedViews[0].defaultFields;
            this.getChildRecords();
        }

        deletePin({objectName: event.target.dataset.id})
            .catch(error => {
                this.getPinnedViews();
                this.showNotification('Error', error.body.message, 'error');
            })
    }

    getSelectableFields(){
        getFieldsFromType({
            typeName: this.selectedType
        }).then(result => {
            this.selectableFields = [];
            this.selectedFields = [];
            for(let i=0; i<result.length; i++){
                let dto = {};
                for(let key in result[i]){
                    dto[key] = result[i][key];
                }

                if(i < 10){
                    dto.selected = true;
                    this.selectedFields.push(dto);
                }

                this.selectableFields.push(dto);
            }
            this.selectableFieldByName = new Map(
                this.selectableFields.map(field => {
                    return [field.name, field];
            }));

            this.getRecords();
        })
        .catch(error => {
            throw error;
        })
    }

    handleFieldClicked(event){
        debugger;
        let fieldName = event.target.dataset.id;
        let field = this.selectableFieldByName.get(fieldName);

        let newSelectedFields = this.selectedFields;
        if(field.selected){ // unselect field
            field.selected = false;
            newSelectedFields = newSelectedFields.filter(f => f.name !== field.name);
        }else if(this.selectedFields.length < 10){ // select field
            field.selected = true
            newSelectedFields.push(field);
        }

        this.selectedFields = newSelectedFields;
    }

    handleChildTypeChange(event){
        this.selectedType = event.target.value;
        this.getSelectableFields();
        this.getChildRecords();
    }

    saveRecords(event){
        let sObjects = [];

        // use reducer here? 
        let table = this.template.querySelectorAll('c-table');
        let rows = table[0].getRows();
        for(let i = 0; i<rows.length; i++){
            sObjects.push(rows[i].updatedSObject);
        }

        saveRecords({
            sObjects: sObjects
        }).then(result => {
            this.showNotification('Records saved successfully', '', 'success');
            this.saved = !this.saved;

        }).catch(error => {
            this.showNotification('We hit a snag', error.body.message, 'error');
        })

        this.isEditingRow = false;
    }

    pinView(){
        try {

            for(let i=0; i<this.pinnedViews.length; i++){
                if(this.pinnedViews[i].objectName === this.selectedType){
                    this.showNotification('You already pinned a view for this object', 'Please remove the existing view to create a new one for this object type', 'error');
                    return;
                }
            }

            pinLayout({
                objectName: this.selectedType,
                fields: this.selectedFields
            })
                .then(result => {
                    this.showNotification('Pinned', '', 'success');
                    this.pinnedViews.push({
                        objectName: this.selectedType,
                        defaultFields: this.selectedFields
                    });
                })
                .catch(error => {
                    throw error;
                })
        }catch (error) {
            console.error(error);
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

    stopPoller(){
        this.isEditingRow = true;
    }
}