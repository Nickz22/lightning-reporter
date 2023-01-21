import { LightningElement, api, track } from 'lwc';

export default class BlockRows extends LightningElement {

    @track blockRows;
    @api rows;

    handleRowClick(event){
        const selectedEvent = new CustomEvent('blockrowclick', { 
            detail: event.target.dataset.id 
        });
        this.dispatchEvent(selectedEvent);
    }
}