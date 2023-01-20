import { LightningElement, api, wire, track } from 'lwc';
import userHasPermission from '@salesforce/apex/LightningReporterController.userHasPermission';
import getChildTypes from '@salesforce/apex/LightningReporterController.getChildTypes';
import getContext from '@salesforce/apex/LightningReporterController.getContext'
import getFieldsFromType from '@salesforce/apex/LightningReporterController.getFieldsFromType'
import saveRecords from '@salesforce/apex/LightningReporterController.saveRecords'
import pinLayout from '@salesforce/apex/LightningReporterController.pinLayout'
import getPinnedViews from '@salesforce/apex/LightningReporterController.getPinnedViews';
import deletePin from '@salesforce/apex/LightningReporterController.deletePin';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import SystemModstamp from '@salesforce/schema/Account.SystemModstamp';

export default class LightningReporter extends LightningElement {
    @api recordId;
    @track childRecords;
    @track selectedFields;
    @track pinnedViews = [];
    @track alerts = [];
    @track alert = false;
    @track displayAlerts = false;
    @track isLoading = false;
    selectableFields;
    childTypes;
    saved = false;
    iconName;
    polling = false;
    isEditingRow = false;

    set selectedType(value){
        if(value !== this._selectedType){ 
            this._selectedType = value;
            this.iconName = `standard:${this._selectedType?.toLowerCase()}`;
        }
    }

    get selectedType(){
        return this._selectedType;
    }

    renderedCallback(){
        if(!this.polling){
            this.polling = true;
            setInterval(() => {
                try {
                    if(this.isEditingRow || this.childRecords?.length === 0){ 
                        return; 
                    }
                    this.getChildRecords(false);
                } catch (error) {
                    this.showNotification('Error getting records', error.message, 'error');
                    this.isLoading = false;
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
        userHasPermission()
            .then(hasPermission => {
                this.hasPermission = hasPermission;
                if(hasPermission){
                    if(data){
                        this.childTypes = data;
                        this.getPinnedViews();
                    }else{
                        console.error('no data returned from getChildTypes');
                    }
                }
            })
            .catch(error => {
                this.showNotification('Error getting permissions', error.body?.message, 'error');
            })
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

    imperativeRefresh(){
        this.imperative = true;
        this.isLoading = true;
        this.getChildRecords(true);
    }

    focusOnAlertView(event){
        this.selectedType = event.detail;
        this.selectableFields = [];
        this.selectedFields = [];
        this.displayAlerts = false;
        this.getChildRecords(true);
    }

    getChildRecords(isLoading){
        this.isLoading = isLoading;
        // this setup needs to be done for every fetch
        if(!this.selectableFields || this.selectableFields.length === 0){
            this.getSelectableFields();
        }else{
            this.getRecords();
        }
    }

    getRecords(){
        getContext({
            typeName: this.selectedType,
            contextRecordId: this.recordId,
            fieldsToGet: this.selectedFields
        })
            .then(context => {
                try {
                    let sObjects = context.subjects;
                    let alerts = [];
                    for(let i=0; i<context.alerts.length; i++){
                        let alert = {
                            Key: context.alerts[i].Id,
                            DataId: context.alerts[i].parentSObjectType,
                            Url: context.alerts[i].note.CreatedBy.FullPhotoUrl,
                            Time: new Date(context.alerts[i].localCreatedDate),
                            Content: context.alerts[i].note.Body,
                            Style: "note-body"
                        };
                        alerts.push(alert);
                    }
                    this.alerts = alerts
                    this.alert = this.alerts.length > 0;
                    this.childRecords = sObjects;

                    if(this.imperative){
                        this.showNotification('Success', 'Records retrieved', 'success');
                        this.imperative = false;
                    }
                    this.isLoading = false;
                } catch (error) {
                    this.showNotification('Error getting records', error.message, 'error');
                }
            }).catch(error => {
                this.isLoading = false;
                this.showNotification('Error getting records', error.body?.message, 'error');
            })
    }

    getPinnedViews(){
        getPinnedViews()
            .then(result => {
                this.pinnedViews = [...result];
                if(this.pinnedViews.length > 0){
                    this.selectedType = this.pinnedViews[0].objectName;
                    this.selectedFields = this.pinnedViews[0].defaultFields;
                    for(let i=0; i<this.selectedFields.length; i++){
                        this.selectedFields[i].Style = 'field-name field-selected';
                    }
                    this.selectableFields = this.pinnedViews[0].defaultFields;
                    this.getChildRecords(true);
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

    getSelectableFields(){
        getFieldsFromType({
            typeName: this.selectedType
        }).then(result => {
            let selectableFields = [];
            let selectedFields = [];
            for(let i=0; i<result.length; i++){
                let dto = {};
                for(let key in result[i]){
                    dto[key] = result[i][key];
                }

                if(i < 10){
                    dto.selected = true;
                    dto.Style = 'field-name field-selected'
                    selectedFields.push(dto);
                }else{
                    dto.selected = false;
                    dto.Style = 'field-name'
                }

                selectableFields.push(dto);
            }

            this.selectableFields = selectableFields;
            this.selectedFields = selectedFields;
            this.getRecords();
        })
        .catch(error => {
            throw error;
        })
    }

    handleFieldClicked(event){
        let fieldName = event.detail;

        let newSelectableFields = [...this.selectableFields];
        for(let i=0; i<newSelectableFields.length; i++){
            if(newSelectableFields[i].name.toLowerCase() === fieldName.toLowerCase()){
                newSelectableFields[i].selected = !newSelectableFields[i].selected
                newSelectableFields[i].Style = newSelectableFields[i].selected ? 'field-name field-selected' : 'field-name';
                // remove this field from this.selectedFields
                if(!newSelectableFields[i].selected){
                    this.selectedFields = this.selectedFields.filter(field => field.name !== newSelectableFields[i].name);
                }else{
                    this.selectedFields.push(newSelectableFields[i]);
                }
                break;
            }
        }

        this.selectableFields = newSelectableFields;
    }

    handleChildTypeSelected(event){
        this.selectedType = event.detail;
        this.isLoading = true;
        this.childRecords = [];
        this.selectableFields = [];
        this.selectedFields = [];
        this.getSelectableFields();
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
            this.showNotification('We hit a snag', error.body?.message, 'error');
        })

        this.isEditingRow = false;
    }

    pinView(){
        try {

            for(let i=0; i<this.pinnedViews.length; i++){
                if(this.pinnedViews[i].objectName === this.selectedType){
                    this.showNotification('View already exists', 'Please remove the existing view to create a new view for this object', 'error');
                    return;
                }
            }

            pinLayout({
                objectName: this.selectedType,
                fields: this.selectedFields
            })
                .then(result => {
                    this.pinnedViews.push({
                        objectName: this.selectedType,
                        label: this.selectedType,
                        defaultFields: this.selectedFields
                    });
                    this.showNotification('Pinned', '', 'success');
                })
                .catch(error => {
                    // get message from error
                    this.showNotification('Error pinning layout', error.body?.message, 'error');
                })
        }catch (error) {
            this.showNotification('Error pinning view', error.message, 'error');
        }
    }

    setView(event){
        try {
            this.selectedType = event.detail;
            this.selectedFields = [];
            // get pinned view matching selected type
            let pinnedView = this.pinnedViews.find(view => view.objectName === this.selectedType);
            let selectableFields = [...pinnedView.defaultFields];
            for(let i=0; i<selectableFields; i++){
                selectableFields[i].selected = true;
                selectableFields[i].Style = selectableFields[i].selected ? 'field-name field-selected' : 'field-name';
            }
            this.selectedFields = selectableFields;
            this.selectableFields = selectableFields;
            this.getChildRecords(true);
        } catch (error) {
            this.showNotification('Error setting view', error.message, 'error');
        }
    }

    removePin(event){
        try {
            let pinnedViews = [...this.pinnedViews];
            for(let i=0; i<pinnedViews.length; i++){
                if(pinnedViews[i].objectName === event.detail){
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
                this.isLoading = true;
                this.getChildRecords(true);
            }

            deletePin({objectName: event.detail})
                .catch(error => {
                    this.getPinnedViews();
                    this.showNotification('Error removing pin', error.body?.message, 'error');
                })
        } catch (error) {
            this.showNotification('Error removing pin', error.message, 'error');
        }
    }

    showAlerts(){
        this.displayAlerts = true;
    }

    showNotification(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message != null ? message : 'unhandled exception',
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

    stopPoller(){
        this.isEditingRow = true;
    }

    checkForSpinnerHardEscape(event){
        event.target.classList.add('slds-hide');
    }
}