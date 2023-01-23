export class Cell {

    constructor(dataId, label, value, type, isEditable, isReference, url, isDatetime){
        this.DataId = dataId;
        this.Label = label;
        this.Value = value;
        this.Type = type;
        this.type = type;
        this.IsEditable = isEditable;
        this.IsReference = isReference;
        this.Url = url;
        this.IsDatetime = isDatetime;
        this.ReadOnly = true;
    }
}

export function getCell(
    dataId,
    label,
    value,
    type,
    isEditable,
    isReference,
    url,
    isDatetime
){
    return new Cell(
        dataId,
        label,
        value,
        type,
        isEditable,
        isReference,
        url,
        isDatetime
    );
}