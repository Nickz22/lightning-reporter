public class LightningReporterController {
    
    @AuraEnabled(cacheable=true)
    public static List<String> getChildTypes(Id recordId){
        List<String> childTypes = new List<String>();
        DescribeSObjectResult typeDescribe = recordId.getSobjectType().getDescribe();
        for(Schema.ChildRelationship relationship : typeDescribe.getChildRelationships()){
            String childTypeName = relationship.getChildSObject().getDescribe().getName();
            if(childTypeName == 'Contact'){
                childTypes.add(relationship.getChildSObject().getDescribe().getName());
            }
        }
        
        return childTypes;
    }

    @AuraEnabled
    public static List<SObject> getRecordsFromType(String typeName, Id parentId, List<FieldDTO> fieldsToGet){

        SObjectType typeFromName = Schema.getGlobalDescribe().get(typeName);
        List<String> lookupsToParent = new List<String>();
        Map<String, Schema.SObjectField> fieldTokenByName = typeFromName.getDescribe().fields.getMap();

        for(String fieldName : fieldTokenByName.keyset()){
            DescribeFieldResult fieldDescribe = fieldTokenByName.get(fieldName).getDescribe();

            if(fieldDescribe.getType() == Schema.DisplayType.REFERENCE){ // is the field lookup up to Account?
                SObjectType lookupType = fieldDescribe.getReferenceTo()[0];
                if(lookupType.getDescribe().getName() == parentId.getSobjectType().getDescribe().getName()){
                    lookupsToParent.add(fieldName);
                }
            }
        }

        List<String> fieldApiNames = new List<String>();
        for(FieldDTO field : fieldsToGet){
            fieldApiNames.add(field.name);
        }

        String query = 'SELECT '+String.join(fieldApiNames, ',')+' '+
                        'FROM '+typeName+' '+
                        getWhereClause(lookupsToParent, parentId);
        
        List<SObject> records = new List<SObject>();
        for(SObject record : Database.query(query)){
            for(String field : fieldApiNames){
                if(record.get(field) == null){
                    record.put(field, null);
                }
            }
            records.add(record);
        }
        return records;
    }    

    public class FieldDTO{
        @AuraEnabled public String name {get; set;}
        @AuraEnabled public String label {get; set;}
        @AuraEnabled public String type {get; set;}
        @AuraEnabled public Boolean isUpdateable {get; set;}
        @AuraEnabled public Boolean defaultSelected = false;

        public FieldDTO(String name, String label, String type, Boolean isUpdateable){
            this.name = name;
            this.label = label;
            this.type = type;
            this.isUpdateable = isUpdateable;
            this.defaultSelected = (name == 'Id' || name == 'Name');
        }

        public FieldDTO(){}
    }

    @AuraEnabled
    public static List<FieldDTO> getFieldsFromType(String typeName){

        List<FieldDTO> fields = new List<FieldDTO>();
        SObjectType typeFromName = Schema.getGlobalDescribe().get(typeName);
        Map<String, Schema.SObjectField> fieldTokenByName = typeFromName.getDescribe().fields.getMap();
        List<String> iterableFieldNames = new List<String>(fieldTokenByName.keyset());
        iterableFieldNames.sort();

        for(String fieldName : iterableFieldNames){
            DescribeFieldResult describe = fieldTokenByName.get(fieldName).getDescribe();
            fields.add(new FieldDTO(
                describe.getName(),
                describe.getLabel(),
                String.valueOf(describe.getType()),
                describe.isUpdateable()
            ));
        }
        return fields;
    }

    @AuraEnabled
    public static void updateRecords(List<SObject> sObjects){
        List<Database.SaveResult> results = Database.update(sObjects, false);
    }

    // helpers
    private static String getWhereClause(List<String> lookupsToParent, Id parentId){
        
        String whereClause = 'WHERE ';       
        for(String lookup : lookupsToParent){
            whereClause += lookup+' = \''+parentId+'\' OR ';
        }

        return whereClause.removeEnd(' OR ');
    }
}
