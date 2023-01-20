import { LightningElement, api, track } from 'lwc';

export default class BlockRows extends LightningElement {

    @track blockRows;
    @api rows;

    // @api get rows() {
    //     return this._rows;
    // }

    // set rows(value){
    //     if(value){ 
    //         console.log('setting rows ');
    //         // log each param of each value
    //         value.forEach(row => {
    //             console.log('row: ' + row);
    //             Object.keys(row).forEach(param => {
    //                 console.log('param: ' + param + ' value: ' + row[param]);
    //             });
    //         });

    //         this._rows = [...value];
    //     }else{
    //         this._rows = [];
    //     }
    // }

    handleRowClick(event){
        console.log('Row Clicked: ' + event.target.dataset.id);
        const selectedEvent = new CustomEvent('blockrowclick', { 
            detail: event.target.dataset.id 
        });
        this.dispatchEvent(selectedEvent);
    }
}