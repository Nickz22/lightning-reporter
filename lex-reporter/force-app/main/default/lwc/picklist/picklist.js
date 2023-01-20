import { LightningElement, api } from 'lwc';

export default class Picklist extends LightningElement {
    @api iconName;
    @api defaultOption;
    @api options;

    handleOptionSelected(event){
        const selectedEvent = new CustomEvent('optionselected', {
            detail: event.target.value,
            bubbles: true
        });
        this.dispatchEvent(selectedEvent);
    }
}