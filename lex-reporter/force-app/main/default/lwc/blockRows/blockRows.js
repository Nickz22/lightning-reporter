import { LightningElement, api } from 'lwc';

export default class BlockRows extends LightningElement {
    @api rows;

    handleRowClick(event){
        const selectedEvent = new CustomEvent('blockrowclick', { 
            detail: event.target.dataset.id 
        });
        this.dispatchEvent(selectedEvent);
    }
}