global class FieldDTO{
    @AuraEnabled global String name {get; set;}
    @AuraEnabled global String label {get; set;}
    @AuraEnabled global String type {get; set;}
    @AuraEnabled global Boolean isUpdateable {get; set;}
    @AuraEnabled global Boolean defaultSelected {get; set;}
    @AuraEnabled global Boolean isCustom {get; set;}

    public FieldDTO(String name, String label, String type, Boolean isUpdateable, Boolean defaultSelected, Boolean isCustom){
        this.name = name;
        this.label = label;
        this.type = type;
        this.isUpdateable = isUpdateable;
        this.defaultSelected = defaultSelected;
        this.isCustom = isCustom;
    }

    global FieldDTO(){}
}