public class TableConfigDTO{
    @AuraEnabled public String objectName {get;set;}
    @AuraEnabled public List<FieldDTO> defaultFields {get;set;}

    public TableConfigDTO(String objectName, List<FieldDTO> defaultFields){
        this.objectName = objectName;
        this.defaultFields = defaultFields;
    }

    public Layout_Configuration__c convertToDbModel(){
        Layout_Configuration__c tableConfig = new Layout_Configuration__c();
        tableConfig.Object__c = this.objectName;
        String defaultFields = '';
        for(FieldDTO f : this.defaultFields){
            defaultFields += f.name + ',';
        }
        tableConfig.Default_Fieldset__c = defaultFields.removeEnd(',');
        return tableConfig;
    }
}