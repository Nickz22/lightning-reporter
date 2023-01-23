export class Cell {
    DataId;
    Label;
    Value;
    Type;
    IsEditable;
    IsReference;
    Url;
    IsDatetime;
    ReadOnly;

    constructor(){
        this.ReadOnly = true;
    }
}