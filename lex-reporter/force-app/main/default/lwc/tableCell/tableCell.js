import { LightningElement, api, track } from 'lwc';

export default class TableCell extends LightningElement {

    @track cellStyle = 'read-only-padding';

    @api get cell(){
        return this._cell;
    }

    set cell(value){
        if(value != null){
            if(value.ReadOnly && this.cellStyle !== 'read-only-padding'){
                this.cellStyle = 'read-only-padding';
            }
        }
        this._cell = value;
    }

    handleClick(event){
        if(this.cell.IsEditable && this.cell.ReadOnly){
            this.dispatchEvent(new CustomEvent('cellclick', {detail: event.target.dataset.id}));
            this.cellStyle = this.cellStyle === 'read-only-padding' ? '' : 'read-only-padding';
        }
    }

    handleValueChange(event){
        this.dispatchEvent(new CustomEvent('valuechange', {detail: {
            Value: event.target.value,
            DataId: event.target.dataset.id
        }}));
    }
}