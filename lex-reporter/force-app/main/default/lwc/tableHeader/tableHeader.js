import { LightningElement, api} from 'lwc';

export default class TableHeader extends LightningElement {
    @api columns;
}