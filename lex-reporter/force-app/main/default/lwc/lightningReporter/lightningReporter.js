import { LightningElement, api, wire, track } from 'lwc';
import getChildTypes from '@salesforce/apex/LightningReporterController.getChildTypes';
import getRecordsFromType from '@salesforce/apex/LightningReporterController.getRecordsFromType'

export default class LightningReporter extends LightningElement {
    @api recordId;
    @track childRecords;
    childTypes;
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
                {label: this.childTypes[i], value: this.childTypes[i]}
            );
        }

        return options;
    }

    getChildRecords(){
        console.log('getting records from '+this.selectedType+' type with Id '+this.recordId);
        getRecordsFromType({
            typeName: this.selectedType,
            parentId: this.recordId
        }).then(result => {
            console.log('retrieved '+result.length+' records from type: '+this.childTypes[0]);
            this.childRecords = result;
        }).catch(error => {
            console.error('error getting records ['+error.body.message+']');
        })
    }

    handleChildTypeChange(event){
        console.log('new child type: '+event.target.value);
        this.selectedType = event.target.value;
        this.getChildRecords();
    }
}