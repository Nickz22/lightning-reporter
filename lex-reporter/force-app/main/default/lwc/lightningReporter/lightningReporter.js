import { LightningElement, api, wire, track } from "lwc";
import userHasPermission from "@salesforce/apex/LightningReporterController.userHasPermission";
import getChildTypes from "@salesforce/apex/LightningReporterController.getChildTypes";
import getContext from "@salesforce/apex/LightningReporterController.getContext";
import getFieldsFromType from "@salesforce/apex/LightningReporterController.getFieldsFromType";
import saveRecords from "@salesforce/apex/LightningReporterController.saveRecords";
import pinLayout from "@salesforce/apex/LightningReporterController.pinLayout";
import getPinnedViews from "@salesforce/apex/LightningReporterController.getPinnedViews";
import deletePin from "@salesforce/apex/LightningReporterController.deletePin";
import filterByNaturalLanguage from "@salesforce/apex/LightningReporterController.filterByNaturalLanguage";
import gptSummarize from "@salesforce/apex/LightningReporterController.gptSummarize";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class LightningReporter extends LightningElement {
  @api recordId;
  @track childRecords;
  @track selectedFields;
  @track pinnedViews = [];
  @track alerts = [];
  @track alert = false;
  @track displayAlerts = false;
  @track isLoading = false;
  @track searchTerm = "";
  @track showNaturalLanguageSearchModal = false;
  @track gptSummary;
  selectableFields;
  childTypes;
  saved = false;
  iconName;
  polling = false;
  isEditingRow = false;

  handleSearchChange(event) {
    this.searchTerm = event.target.value;
  }

  set selectedType(value) {
    if (value !== this._selectedType) {
      this._selectedType = value;
      this.iconName = `standard:${this._selectedType?.toLowerCase()}`;
    }
  }

  get selectedType() {
    return this._selectedType;
  }

  get options() {
    let options = [];

    if (!this.childTypes) {
      return options;
    }

    for (let i = 0; i < this.childTypes.length; i++) {
      options.push({
        label: this.childTypes[i],
        value: this.childTypes[i]
      });
    }

    return options;
  }

  @wire(getChildTypes, { recordId: "$recordId" })
  async getRecordsFromDefaultChildType({ error, data }) {
    this.isLoading = true;
    try {
      if (error) {
        console.error("error getting default child records: " + error);
        this.isLoading = false;
        return;
      }
      this.hasPermission = await userHasPermission();
      if (this.hasPermission) {
        if (data) {
          this.childTypes = data;
          this.getPinnedViews();
        } else {
          console.error("no data returned from getChildTypes");
        }
      }
    } catch (e) {
      this.showNotification(
        "Error getting permissions",
        e.body?.message,
        "error"
      );
    }
    this.isLoading = false;
  }

  renderedCallback() {
    if (!this.polling) {
      // this.polling = true;
      // setInterval(() => {
      //     try {
      //         if(this.isEditingRow || this.childRecords?.length === 0){
      //             return;
      //         }
      //         this.getChildRecords(false);
      //     } catch (error) {
      //         this.showNotification('Error getting records', error.message, 'error');
      //         this.isLoading = false;
      //     }
      // }, 10000);
    }
  }

  toggleNaturalLanguageSearchModal() {
    this.showNaturalLanguageSearchModal = !this.showNaturalLanguageSearchModal;
  }

  async imperativeRefresh() {
    this.imperative = true;
    this.isLoading = true;
    await this.getChildRecords(true);
    const summary = await gptSummarize({
      idsToSummarize: this.childRecords.map((record) => record.record.Id),
      fieldsToSummarize: this.selectedFields
    });

    let summaryText = "";
    for (let i = 0; i < summary.length; i++) {
      summaryText += summary[i];
      this.gptSummary = summaryText;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    this.isLoading = false;
  }

  async focusOnAlertView(event) {
    this.selectedType = event.detail;
    this.selectableFields = [];
    this.selectedFields = [];
    this.displayAlerts = false;
    this.getChildRecords(true);
  }

  async getChildRecords(isLoading) {
    this.isLoading = isLoading;
    // this setup needs to be done for every fetch
    if (!this.selectableFields || this.selectableFields.length === 0) {
      this.getSelectableFields();
    } else {
      await this.getRecords();
    }
  }

  async askGpt() {
    console.log(`askGpt: ${this.searchTerm}`);
    await filterByNaturalLanguage({ naturalQueryString: this.searchTerm });
  }

  async getRecords() {
    const context = await getContext({
      typeName: this.selectedType,
      contextRecordId: this.recordId,
      fieldsToGet: this.selectedFields
    });
    try {
      const sObjects = [...context.subjects];
      const dbAlerts = [];
      for (let i = 0; i < context.alerts.length; i++) {
        dbAlerts.push({
          Key: context.alerts[i].Id,
          DataId: context.alerts[i].parentSObjectType,
          Url: context.alerts[i].note.CreatedBy.FullPhotoUrl,
          Time: new Date(context.alerts[i].localCreatedDate),
          Content: context.alerts[i].note.Body,
          Style: "note-body"
        });
      }

      this.alerts = dbAlerts;
      this.alert = this.alerts.length > 0;
      this.childRecords = sObjects;

      if (this.imperative) {
        this.showNotification("Success", "Records retrieved", "success");
        this.imperative = false;
      }

      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      this.showNotification("Error getting records", error.message, "error");
    }
  }

  getPinnedViews() {
    getPinnedViews()
      .then((result) => {
        this.pinnedViews = [...result];
        if (this.pinnedViews.length > 0) {
          let selectedFields = [];
          for (let i = 0; i < this.pinnedViews[0].defaultFields.length; i++) {
            let field = {
              ...this.pinnedViews[0].defaultFields[i],
              selected: true,
              Style: "field-name field-selected"
            };
            selectedFields.push(field);
          }
          this.selectedType = this.pinnedViews[0].objectName;
          this.selectedFields = selectedFields;
          this.selectableFields = selectedFields;
          this.getChildRecords(true);
        } else {
          this.selectedType = null;
          this.selectedFields = [];
          this.selectableFields = [];
          this.childRecords = [];
          this.isLoading = false;
        }
      })
      .catch((error) => {
        // print stack trace
        console.error(error);
        this.isLoading = false;
        this.showNotification(
          "Error getting pinned views",
          error.body?.message,
          "error"
        );
      });
  }

  async getSelectableFields() {
    try {
      const fields = await getFieldsFromType({
        typeName: this.selectedType
      });
      const selectableFields = [];
      const selectedFields = [];
      for (let i = 0; i < fields.length; i++) {
        let dto = {
          ...fields[i],
          selected: i < 10,
          Style: i < 10 ? "field-name field-selected" : "field-name"
        };

        if (dto.selected) {
          selectedFields.push(dto);
        }

        selectableFields.push(dto);
      }

      this.selectableFields = selectableFields;
      this.selectedFields = selectedFields;
      await this.getRecords();
      console.log("here 9");
    } catch (error) {
      console.error(`error in getSelectableFields: ${error}`);
      this.isLoading = false;
    }
  }

  handleFieldClicked(event) {
    let fieldName = event.detail;

    let newSelectableFields = [...this.selectableFields];
    for (let i = 0; i < newSelectableFields.length; i++) {
      if (
        newSelectableFields[i].name.toLowerCase() === fieldName.toLowerCase()
      ) {
        newSelectableFields[i].selected = !newSelectableFields[i].selected;
        newSelectableFields[i].Style = newSelectableFields[i].selected
          ? "field-name field-selected"
          : "field-name";
        // remove this field from this.selectedFields
        if (!newSelectableFields[i].selected) {
          this.selectedFields = this.selectedFields.filter(
            (field) => field.name !== newSelectableFields[i].name
          );
        } else {
          this.selectedFields.push(newSelectableFields[i]);
        }
        break;
      }
    }

    this.selectableFields = newSelectableFields;
  }

  handleChildTypeSelected(event) {
    this.selectedType = event.detail;
    this.isLoading = true;
    this.childRecords = [];
    this.selectableFields = [];
    this.selectedFields = [];
    this.getSelectableFields();
  }

  saveRecords(event) {
    let sObjects = [];

    // use reducer here?
    let table = this.template.querySelectorAll("c-table");
    let rows = table[0].getRows();
    for (let i = 0; i < rows.length; i++) {
      sObjects.push(rows[i].updatedSObject);
    }

    saveRecords({
      sObjects: sObjects
    })
      .then((result) => {
        this.showNotification("Records saved successfully", "", "success");
        this.saved = !this.saved;
      })
      .catch((error) => {
        this.showNotification("We hit a snag", error.body?.message, "error");
      });

    this.isEditingRow = false;
  }

  pinView() {
    try {
      for (let i = 0; i < this.pinnedViews.length; i++) {
        if (this.pinnedViews[i].objectName === this.selectedType) {
          this.showNotification(
            "View already exists",
            "Please remove the existing view to create a new view for this object",
            "error"
          );
          return;
        }
      }

      pinLayout({
        objectName: this.selectedType,
        fields: this.selectedFields
      })
        .then((result) => {
          this.pinnedViews.push({
            objectName: this.selectedType,
            label: this.selectedType,
            defaultFields: this.selectedFields
          });
          this.showNotification("Pinned", "", "success");
        })
        .catch((error) => {
          // get message from error
          this.showNotification(
            "Error pinning layout",
            error.body?.message,
            "error"
          );
        });
    } catch (error) {
      this.showNotification("Error pinning view", error.message, "error");
    }
  }

  setView(event) {
    try {
      this.selectedType = event.detail;
      this.selectedFields = [];
      // get pinned view matching selected type
      let pinnedView = this.pinnedViews.find(
        (view) => view.objectName === this.selectedType
      );

      let selectableFields = [];
      for (let i = 0; i < pinnedView.defaultFields.length; i++) {
        selectableFields.push({
          ...pinnedView.defaultFields[i],
          selected: true,
          Style: "field-name field-selected"
        });
      }
      this.selectedFields = selectableFields;
      this.selectableFields = selectableFields;
      this.getChildRecords(true);
    } catch (error) {
      this.showNotification("Error setting view", error.message, "error");
    }
  }

  removePin(event) {
    try {
      let pinnedViews = [...this.pinnedViews];
      for (let i = 0; i < pinnedViews.length; i++) {
        if (pinnedViews[i].objectName === event.detail) {
          pinnedViews.splice(i, 1);
          break;
        }
      }

      this.pinnedViews = pinnedViews;

      if (this.pinnedViews.length === 0) {
        this.selectedType = null;
        this.childRecords = [];
        this.selectableFields = [];
        this.selectedFields = [];
      } else {
        this.selectedType = this.pinnedViews[0].objectName;
        this.selectedFields = this.pinnedViews[0].defaultFields;
        this.selectableFields = this.pinnedViews[0].defaultFields;
        this.isLoading = true;
        this.getChildRecords(true);
      }

      deletePin({ objectName: event.detail }).catch((error) => {
        this.getPinnedViews();
        this.showNotification(
          "Error removing pin",
          error.body?.message,
          "error"
        );
      });
    } catch (error) {
      this.showNotification("Error removing pin", error.message, "error");
    }
  }

  showAlerts() {
    this.displayAlerts = true;
  }

  showNotification(title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message != null ? message : "unhandled exception",
      variant: variant
    });
    this.dispatchEvent(evt);
  }

  stopPoller() {
    this.isEditingRow = true;
  }

  checkForSpinnerHardEscape(event) {
    event.target.classList.add("slds-hide");
  }
}
