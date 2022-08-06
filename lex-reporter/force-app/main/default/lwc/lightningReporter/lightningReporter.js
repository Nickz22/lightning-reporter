import { LightningElement, api, wire, track } from 'lwc';
import getChildTypes from '@salesforce/apex/LightningReporterController.getChildTypes';
import getRecordsFromType from '@salesforce/apex/LightningReporterController.getRecordsFromType'
import getFieldsFromType from '@salesforce/apex/LightningReporterController.getFieldsFromType'
import dbUpdateRecords from '@salesforce/apex/LightningReporterController.updateRecords'

export default class LightningReporter extends LightningElement {
    @api recordId;
    @track childRecords;
    childTypes;
    selectableFields;
    @track selectedFields = new Set(["Id", "Name"]);
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
            console.log('retrieved '+this.childTypes.length+' child types: ');
            this.getChildRecords(this.recordId);
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
        if(!this.selectableFields){
            this.getSelectableFields();
        }
        
        getRecordsFromType({
            typeName: this.selectedType,
            parentId: this.recordId,
            fieldsToGet: Array.from(this.selectedFields)
        }).then(result => {
            for(let i=0; i<result.length; i++){
                result['sObjectType'] = this.selectedType;
            }
            this.childRecords = result;
        }).catch(error => {
            console.error('error getting records ['+error.body.message+']');
        })
    }

    getSelectableFields(){
        getFieldsFromType({
            typeName: this.selectedType
        })
        .then(result => {
            console.log('retrieved '+result.length+' fields from type: '+this.selectedType);
            this.selectableFields = result;
        })
        .catch(error => {
            console.error('error getting records ['+
                                    error.body ? 
                                    error.body.message : 
                                    error.message+']');
        })
    }

    handleFieldClicked(evt){
        let fieldName = evt.target["dataset"]["id"];
        console.log('field clicked: '+fieldName);
        if(fieldName.toLowerCase() == "id" || fieldName.toLowerCase() == "name"){
            return;
        }

        let fieldSet = new Set();
        for(let i of this.selectedFields){
            fieldSet.add(i);
        }

        if(evt.target.classList && evt.target.classList.contains("field-selected")){
            evt.target.classList.remove("field-selected");
            fieldSet.delete(fieldName);
        }else{
            evt.target.classList.add("field-selected");
            fieldSet.add(fieldName);
        }

        this.selectedFields = fieldSet;
    }

    handleChildTypeChange(event){
        console.log('new child type: '+event.target.value);
        this.selectedType = event.target.value;
        this.getChildRecords();
    }

    updateRecords(event){
        console.log('updating records');
        let sObjects = [];

        // use reducer here? 
        let table = this.template.querySelectorAll('c-table');
        console.log('table length: '+table.length);
        let rows = table[0].getRows();
        console.log('got '+rows.length+' rows');
        for(let i = 0; i<rows.length; i++){
            console.log(JSON.stringify(rows[i].updatedSObject));
            sObjects.push(rows[i].updatedSObject);
        }

        dbUpdateRecords({
            sObjects: sObjects
        }).then(result => {
            console.log('returned from apex: '+result);
        }
        ).catch(error => {
            console.error('error updating records ['+error.body.message+']');
        })

    }
}