import { LightningElement, api, wire, track } from 'lwc';
import getChildTypes from '@salesforce/apex/LightningReporterController.getChildTypes';
import getRecordsFromTypeLookingUpToId from '@salesforce/apex/LightningReporterController.getRecordsFromTypeLookingUpToId'
import getFieldsFromType from '@salesforce/apex/LightningReporterController.getFieldsFromType'
import dbUpdateRecords from '@salesforce/apex/LightningReporterController.updateRecords'
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
        debugger;
        getRecordsFromTypeLookingUpToId({
            typeName: this.selectedType,
            parentId: this.recordId,
            fieldsToGet: this.selectedFields
        }).then(result => {
            try{
                for(let i=0; i<result.length; i++){
                    result[i].record.sObjectType = this.selectedType;
                }
                this.childRecords = result;
            }catch(e){
                console.error('error getting records ['+e+']');
            }
        }).catch(error => {
            console.error('error getting records ['+error.body.message+']');
        })
    }

    getSelectableFields(){
        getFieldsFromType({
            typeName: this.selectedType
        }).then(result => {
            this.selectableFields = result;
            this.selectableFieldByName = new Map(
                this.selectableFields.map(field => {
                    return [field.name, field];
            }));

            this.selectedFields = [];
            for(let i=0; i<result.length; i++){
                let dto = result[i];
                if(dto.defaultSelected){
                    this.selectedFields.push(dto);
                }
            }

            this.getRecords();
        })
        .catch(error => {
            console.error('error getting selectable fields ['+
                                    error.body ? 
                                    error.body.message : 
                                    error.message+']');
        })
    }

    handleFieldClicked(evt){
        let fieldName = evt.target["dataset"]["id"];
        console.log('clicked :'+fieldName);
        if(fieldName.toLowerCase() == "id" || fieldName.toLowerCase() == "name"){
            console.log('retuning');
            return;
        }

        // this pattern is weird and wasteful, but I'm not sure if there's
        // a better way to do clone one list into another
        let newSelectedFieldByName = new Map();
        for(let i = 0; i<this.selectedFields.length; i++){
            let selectedField = this.selectedFields[i];
            newSelectedFieldByName.set(selectedField.name, selectedField);
        }

        if(evt.target.classList && evt.target.classList.contains("field-selected")){
            evt.target.classList.remove("field-selected");
            newSelectedFieldByName.delete(fieldName);
        }else{
            evt.target.classList.add("field-selected");
            newSelectedFieldByName.set(fieldName, this.selectableFieldByName.get(fieldName));
        }

        this.selectedFields = Array.from(newSelectedFieldByName.values());
    }

    handleChildTypeChange(event){
        this.selectedType = event.target.value;
        this.getChildRecords();
    }

    updateRecords(event){
        let sObjects = [];

        // use reducer here? 
        let table = this.template.querySelectorAll('c-table');
        let rows = table[0].getRows();
        for(let i = 0; i<rows.length; i++){
            sObjects.push(rows[i].updatedSObject);
        }

        dbUpdateRecords({
            sObjects: sObjects
        }).then(result => {
            this.showNotification('Records saved successfully', '', 'success');
            this.saved = !this.saved;

        }).catch(error => {
            this.showNotification('We hit a snag', error.body.message, 'error');
        })
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