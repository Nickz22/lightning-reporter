import { LightningElement, api, wire, track } from 'lwc';
import getChildTypes from '@salesforce/apex/LightningReporterController.getChildTypes';
import getRecordsFromType from '@salesforce/apex/LightningReporterController.getRecordsFromType'

export default class LightningReporter extends LightningElement {
    @api recordId;
    @track childRecords;
    childTypes;
    @wire (getChildTypes, {recordId : '$recordId'})
    getRecordsFromDefaultChildType({error, data}){
        if(error){
            console.error('error getting default child records: '+error)
            return;
        }
        if(data){
            this.childTypes = data;
            console.log('retrieved '+this.childTypes.length+' child types: ');
            this.getDefaultChildRecords(this.recordId);
        }else{
            console.error('no data returned from getChildTypes');
        }
    }

    getDefaultChildRecords(){
        console.log('getting records from '+this.childTypes[0]+' type with Id '+this.recordId);
        getRecordsFromType({
            typeName: this.childTypes[0],
            parentId: this.recordId
        }).then(result => {
            console.log('retrieved '+result.length+' records from type: '+this.childTypes[0]);
            this.childRecords = result;
        }).catch(error => {
            console.error('error getting records ['+error.body.message+']');
        })
    }
}