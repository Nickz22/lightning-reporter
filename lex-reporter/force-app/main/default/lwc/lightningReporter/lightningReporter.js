import { LightningElement, api, wire, track } from 'lwc';
import getChildTypes from '@salesforce/apex/LightningReporterController.getChildTypes';
import getRecordsFromTypeLookingUpToId from '@salesforce/apex/LightningReporterController.getRecordsFromTypeLookingUpToId'
import getFieldsFromType from '@salesforce/apex/LightningReporterController.getFieldsFromType'
import saveRecords from '@salesforce/apex/LightningReporterController.saveRecords'
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class LightningReporter extends LightningElement {
    @api recordId;
    @track childRecords;
    childTypes;
    selectableFields;
    selectableFieldByName = new Map();
    @track selectedFields;
    saved = false;
    selectedType;
    polling = false;
    isEditingRow = false;

    renderedCallback(){
        if(!this.polling){
            this.polling = true;
            setInterval(() => {
                try {
                    if(this.isEditingRow){ 
                        return; 
                    }
                    this.getChildRecords();   
                } catch (error) {
                    console.error(error);
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
            this.getChildRecords();
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
        }).then(result => {
            for(let i=0; i<result.length; i++){
                result[i].record.sObjectType = this.selectedType;
            }
            this.childRecords = result;
        }).catch(error => {
            throw error;
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
        let fieldName = event.target.dataset.id;
        let field = this.selectableFieldByName.get(fieldName);

        if(field.selected){ // unselect field
            field.selected = false;
        }else if(this.selectedFields.length < 10){ // select field
            field.selected = true
        }

        this.selectableFieldByName.set(fieldName, field);
        // assign map valuies to this.selectedFields
        let newSelectableFields = [];
        this.selectableFieldByName.forEach(f => {
            if(f.selected){
                newSelectableFields.push(f);
            }
        });
        this.selectedFields = newSelectableFields;
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

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

    stopPoller(){
        console.log('stopping poller');
        this.isEditingRow = true;
    }
}