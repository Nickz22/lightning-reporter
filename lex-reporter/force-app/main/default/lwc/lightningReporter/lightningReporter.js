import { LightningElement, api, wire, track } from "lwc";
import userHasPermission from "@salesforce/apex/LightningReporterController.userHasPermission";
import getChildTypes from "@salesforce/apex/LightningReporterController.getChildTypes";
import getContext from "@salesforce/apex/LightningReporterController.getContext";
import getFieldsFromType from "@salesforce/apex/LightningReporterController.getFieldsFromType";
import saveRecords from "@salesforce/apex/LightningReporterController.saveRecords";
import pinLayout from "@salesforce/apex/LightningReporterController.pinLayout";
import getPinnedViews from "@salesforce/apex/LightningReporterController.getPinnedViews";
import deletePin from "@salesforce/apex/LightningReporterController.deletePin";
import getLastTableView from "@salesforce/apex/LightningReporterController.getLastTableView";
import insertTableView from "@salesforce/apex/LightningReporterController.insertTableView";
import gptGetTableViewDelta from "@salesforce/apex/LightningReporterController.gptGetTableViewDelta";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
const aiHelpByType = {
  "ai-delta":
    "Use AI to detect changes to the data shown on this view since the last time you checked for deltas"
};
export default class LightningReporter extends LightningElement {
  @api recordId;
  @track childRecords;
  @track selectedFields;
  @track pinnedViews = [];
  @track alerts = [];
  @track alert = false;
  @track displayAlerts = false;
  @track isLoading = false;
  @track showPromptGptModal = false;
  @track gptSummary;
  @track iconHelpText;
  @track searchTerm = "";
  @track filteredRecords;
  @track showFilter = false;
  @track filteringOrShowingGpt = false;
  selectableFields;
  childTypes;
  saved = false;
  iconName;
  polling = false;
  isEditingRow = false;

  @track sortedBy = "";
  @track sortedDirection = "asc";

  handleSort(event) {
    const fieldName = event.detail.fieldName;
    const sortDirection = event.detail.sortDirection;

    // Sort the records.
    this.filteredRecords = this.sortData(fieldName, sortDirection, [
      ...this.filteredRecords
    ]);

    // Update the selectedFields state.
    this.selectedFields = event.detail.columns;
  }

  sortData(fieldName, sortDirection) {
    let data = JSON.parse(JSON.stringify(this.filteredRecords));
    let key = (a) => a.record[fieldName];
    let reverse = sortDirection === "asc" ? 1 : -1;

    data.sort((a, b) => {
      a = key(a) ? key(a) : ""; // Handle null or undefined values
      b = key(b) ? key(b) : "";

      return a > b ? 1 * reverse : -1 * reverse;
    });

    return data;
  }

  filterRecords(records, filters) {
    debugger;
    if (filters.length === 0) {
      return this.childRecords;
    }

    return records.filter((record) => {
      record = record.record;
      return filters.every((filter) => {
        if (!record.hasOwnProperty(filter.field)) {
          return false;
        }
        // find type of filter.field via selectedFields
        const fieldType = this.selectedFields.find(
          (field) => field.name === filter.field
        ).type;

        // parse filter.value into correct type
        switch (fieldType.toLowerCase()) {
          case "string":
            filter.value = filter.value.toString();
            break;
          case "boolean":
            filter.value = filter.value === "true";
            break;
          case "double":
            filter.value = parseFloat(filter.value);
            break;
          case "date":
            filter.value = new Date(filter.value);
            break;
          case "datetime":
            filter.value = new Date(filter.value);
            break;
          case "integer":
            filter.value = parseInt(filter.value);
            break;
          case "currency":
            filter.value = parseFloat(filter.value);
            break;
          case "percent":
            filter.value = parseFloat(filter.value);
            break;
          case "reference":
            filter.value = filter.value.toString();
            break;
          case "email":
            filter.value = filter.value.toString();
            break;
          case "phone":
            filter.value = filter.value.toString();
            break;
          case "url":
            filter.value = filter.value.toString();
            break;
          case "textarea":
            filter.value = filter.value.toString();
            break;
          case "picklist":
            filter.value = filter.value.toString();
            break;
          case "multipicklist":
            filter.value = filter.value.toString();
            break;
          case "combobox":
            filter.value = filter.value.toString();
            break;
          default:
            filter.value = filter.value.toString();
        }

        switch (filter.operator) {
          case "equals":
            return record[filter.field] === filter.value;
          case "contains":
            return record[filter.field].includes(filter.value);
          case "not-equal":
            return record[filter.field] !== filter.value;
          case "not-contains":
            return !record[filter.field].includes(filter.value);
          case "before":
            return new Date(record[filter.field]) < new Date(filter.value);
          case "after":
            return new Date(record[filter.field]) > new Date(filter.value);
          case "on":
            return (
              new Date(record[filter.field]).setHours(0, 0, 0, 0) ===
              new Date(filter.value).setHours(0, 0, 0, 0)
            );
          case "on-before":
            return new Date(record[filter.field]) <= new Date(filter.value);
          case "on-after":
            return new Date(record[filter.field]) >= new Date(filter.value);
          case "greater":
            return record[filter.field] > filter.value;
          case "less":
            return record[filter.field] < filter.value;
          case "greater-equal":
            return record[filter.field] >= filter.value;
          case "less-equal":
            return record[filter.field] <= filter.value;
          default:
            return false;
        }
      });
    });
  }

  handleFilterChange(event) {
    debugger;
    this.filters = event.detail;
    this.filteredRecords = [
      ...this.filterRecords(this.childRecords, this.filters)
    ];
  }

  toggleShowFilter() {
    this.showFilter = !this.showFilter;
    this.filteringOrShowingGpt = this.showFilter;
  }

  handleSearchChange(event) {
    this.searchTerm = event.target.value;
    this.filterChildRecords();
  }

  filterChildRecords() {
    if (!this.searchTerm) {
      this.filteredRecords = this.childRecords;
    } else {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();

      this.filteredRecords = this.childRecords.filter((subjectDTO) => {
        // Check the fields in the 'record' property
        const recordMatches = Object.values(subjectDTO.record).some((value) =>
          String(value).toLowerCase().includes(lowerCaseSearchTerm)
        );

        // Check the 'Body' and 'Title' fields in the 'notes' property
        const notesMatches = subjectDTO.notes.some(
          (noteDTO) =>
            String(noteDTO.note.Body)
              .toLowerCase()
              .includes(lowerCaseSearchTerm) ||
            String(noteDTO.note.Title)
              .toLowerCase()
              .includes(lowerCaseSearchTerm)
        );

        return recordMatches || notesMatches;
      });
    }
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
          await this.getPinnedViews();
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

  /**
   * this is making a mess
   */
  // renderedCallback() {
  //   if (!this.polling) {
  //     this.polling = true;
  //     // eslint-disable-next-line @lwc/lwc/no-async-operation
  //     setInterval(() => {
  //       try {
  //         if (this.isEditingRow || this.childRecords?.length === 0) {
  //           return;
  //         }
  //         this.getChildRecords(false);
  //       } catch (error) {
  //         this.showNotification(
  //           "Error getting records",
  //           error.message,
  //           "error"
  //         );
  //         this.isLoading = false;
  //       }
  //     }, 10000);
  //   }
  // }

  closeGptSummary() {
    this.gptSummary = "";
    this.filteringOrShowingGpt = false;
    this.showFilter = false;
  }

  async displayGptOutput(summary) {
    let summaryText = "";
    this.filteringOrShowingGpt = true;
    for (let i = 0; i < summary.length; i++) {
      summaryText += summary[i];
      this.gptSummary = summaryText;
      // eslint-disable-next-line no-await-in-loop, @lwc/lwc/no-async-operation
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  async gptDetectDelta() {
    const lastTableView = await getLastTableView({
      contextId: this.recordId
    });

    const onlyRecords = this.removeNotesFromRecords(this.childRecords);

    if (!lastTableView.id) {
      const newTableView = {
        id: null,
        objectName: this.selectedType,
        state: JSON.stringify(onlyRecords),
        skinnyState: JSON.stringify({ count: onlyRecords.length }),
        viewer: null,
        contextId: this.recordId
      };
      try {
        await insertTableView({ tableViewDto: newTableView });
      } catch (e) {
        this.showNotification("Error saving view", e.body?.message, "error");
      }

      this.showNotification(
        "View saved in memory",
        "We'll use this view for comparison on your next delta request",
        "success"
      );
    } else {
      const newViewDto = {
        id: null,
        objectName: this.selectedType,
        state: JSON.stringify(onlyRecords),
        skinnyState: JSON.stringify({ count: onlyRecords.length }),
        viewer: null,
        contextId: this.recordId
      };
      const newTableView = await insertTableView({ tableViewDto: newViewDto });
      this.gptSummary = " ";
      this.filteringOrShowingGpt = true;
      try {
        const summary = await gptGetTableViewDelta({
          compareView: lastTableView,
          newView: newTableView
        });
        this.displayGptOutput(summary);
      } catch (e) {
        if (e.body?.message === "timed out") {
          this.showNotification(
            "Initial request timed out",
            "Trying again...",
            "info"
          );
          try {
            const summary = await gptGetTableViewDelta({
              compareView: lastTableView,
              newView: newTableView
            });
            this.displayGptOutput(summary);
          } catch (e2) {
            this.showNotification(
              "Error getting delta",
              e2.body?.message,
              "error"
            );
          }
        }

        this.showNotification("Error getting delta", e.body?.message, "error");
      }
    }
  }

  removeNotesFromRecords(records) {
    return records.map((record) => {
      const { Notes, CreatedBy, ...rest } = record.record;
      return rest;
    });
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

  async getRecords() {
    const context = await getContext({
      typeName: this.selectedType,
      contextRecordId: this.recordId,
      fieldsToGet: this.selectedFields
    });
    this.destructureContext(context);
  }

  destructureContext(context) {
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
      this.filterChildRecords();
      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      this.showNotification("Error getting records", error.message, "error");
    }
  }

  async getPinnedViews() {
    try {
      const result = await getPinnedViews();

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
        await this.getChildRecords(true);
      } else {
        this.selectedType = null;
        this.selectedFields = [];
        this.selectableFields = [];
        this.childRecords = [];
        this.isLoading = false;
      }
    } catch (e) {
      console.error(e);
    }
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

  async handleChildTypeSelected(event) {
    this.selectedType = event.detail;
    this.isLoading = true;
    this.childRecords = [];
    this.selectableFields = [];
    this.selectedFields = [];
    await this.getSelectableFields();
  }

  async saveRecords() {
    try {
      this.isLoading = true;
      let sObjects = [];

      // use reducer here?
      let table = this.template.querySelectorAll("c-table");
      let rows = table[0].getRows();
      for (let i = 0; i < rows.length; i++) {
        sObjects.push(rows[i].updatedSObject);
      }

      await saveRecords({
        sObjects: sObjects
      });

      this.saved = !this.saved;
      await this.imperativeRefresh();
      this.showNotification("Records saved successfully", "", "success");
      this.isEditingRow = false;
    } catch (error) {
      this.showNotification("Error saving records", error.message, "error");
    }
  }

  async imperativeRefresh() {
    this.imperative = true;
    this.isLoading = true;
    await this.getChildRecords(true);
    this.isLoading = false;
  }

  async pinView() {
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

      await pinLayout({
        objectName: this.selectedType,
        fields: this.selectedFields
      });

      this.pinnedViews.push({
        objectName: this.selectedType,
        label: this.selectedType,
        defaultFields: this.selectedFields
      });
      this.showNotification("Pinned", "", "success");
    } catch (error) {
      this.showNotification("Error pinning view", error.message, "error");
    }
  }

  async setView(event) {
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
      await this.getChildRecords(true);
    } catch (error) {
      this.showNotification("Error setting view", error.message, "error");
    }
  }

  showAiHelp(event) {
    const aiType = event.target.dataset.id;
    this.iconHelpText = aiHelpByType[aiType];
  }

  showFilterHelp() {
    this.iconHelpText = "Configure filters on the dataset";
  }

  hideAiHelp() {
    this.iconHelpText = null;
  }

  async removePin(event) {
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
        await this.getChildRecords(true);
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
