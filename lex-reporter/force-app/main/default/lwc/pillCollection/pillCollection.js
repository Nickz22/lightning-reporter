import { LightningElement, api } from 'lwc';

export default class PillCollection extends LightningElement {
    @api pills;


    pillSelected(event){
        const selectedEvent = new CustomEvent('pillselected', {
            detail: event.target.dataset.id,
            bubbles: true
        });
        this.dispatchEvent(selectedEvent);
    }

    pillRemoved(event){
        event.preventDefault();
        console.log('pill removed');
        const selectedEvent = new CustomEvent('pillremoved', {
            detail: event.target.dataset.id,
            bubbles: true
        });
        this.dispatchEvent(selectedEvent);
    }
}