public class LightningReporterController {
    
    @AuraEnabled(cacheable=true)
    public static List<String> getChildTypes(Id recordId){
        Set<String> childTypes = new Set<String>();
        DescribeSObjectResult typeDescribe = recordId.getSobjectType().getDescribe();
        for(Schema.ChildRelationship relationship : typeDescribe.getChildRelationships()){
            String childTypeName = relationship.getChildSObject().getDescribe().getName();
            // remove before releasing
            if(childTypeName == 'Contact'){
                childTypes.add(relationship.getChildSObject().getDescribe().getName());
            }
        }
        
        return new List<String>(childTypes);
    }

    static List<String> getLookupsPointingToParentId(String childTypeName, Id parentId){

        Map<String, Schema.SObjectField> fieldTokenByName = Schema.getGlobalDescribe()
                                                                .get(childTypeName)
                                                                .getDescribe()
                                                                .fields.getMap();
        List<String> lookupsToParent = new List<String>();
        for(String fieldName : fieldTokenByName.keyset()){
            DescribeFieldResult fieldDescribe = fieldTokenByName.get(fieldName).getDescribe();

            if(fieldDescribe.getType() == Schema.DisplayType.REFERENCE){ 
                SObjectType lookupTargetType = fieldDescribe.getReferenceTo()[0]; 
                if(lookupTargetType.getDescribe().getName() == 
                    parentId.getSobjectType().getDescribe().getName()){ // is the field lookup to `parentId`
                    lookupsToParent.add(fieldName);
                }
            }
        }

        return lookupsToParent;
    }

    @AuraEnabled
    public static List<SObject> getRecordsFromTypeLookingUpToId(String typeName, Id parentId, List<FieldDTO> fieldsToGet){

        List<String> lookupsToParent = getLookupsPointingToParentId(typeName, parentId);

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
        @AuraEnabled public Boolean defaultSelected {get; set;}

        public FieldDTO(String name, String label, String type, Boolean isUpdateable, Boolean defaultSelected){
            this.name = name;
            this.label = label;
            this.type = type;
            this.isUpdateable = isUpdateable;
            this.defaultSelected = defaultSelected;
        }

        public FieldDTO(){}
    }

    @AuraEnabled
    public static List<FieldDTO> getFieldsFromType(String typeName){

        List<FieldDTO> fields = new List<FieldDTO>();
        SObjectType typeFromName = Schema.getGlobalDescribe().get(typeName);
        DescribeSObjectResult d = typeFromName.getDescribe();
        Map<String, SObjectField> fieldTokenByApiName = d.fields.getMap();
        List<String> iterableFieldNames = new List<String>(fieldTokenByApiName.keyset());
        iterableFieldNames.sort();

        LEX_Reporter_Table_Configuration__c defaultConfig = [SELECT Default_Fieldset__c 
                                                               FROM LEX_Reporter_Table_Configuration__c
                                                               WHERE Object__c = : typeName
                                                              LIMIT 1];
        String defaultFields = defaultConfig.Default_Fieldset__c;
        for(String fieldName : iterableFieldNames){
            DescribeFieldResult describe = fieldTokenByApiName.get(fieldName).getDescribe();
            FieldDTO dto = new FieldDTO(
                describe.getName(),
                describe.getLabel(),
                String.valueOf(describe.getType()),
                describe.isUpdateable(),
                defaultFields.containsIgnoreCase(fieldName)
            );
            fields.add(dto);
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
