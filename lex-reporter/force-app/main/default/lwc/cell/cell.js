export class Cell {
    DataId;
    Label;
    Value;
    Type;
    Url;
    IsDatetime;
    IsReference;
    IsEditable;
    IsStandardInput;
    ReadOnly;


    constructor(){
        this.ReadOnly = true;
    }
}