public class LightningReporterController {
    
    @AuraEnabled(cacheable=true)
    public static List<String> getChildTypes(Id recordId){
        List<String> childTypes = new List<String>();
        DescribeSObjectResult typeDescribe = recordId.getSobjectType().getDescribe();
        for(Schema.ChildRelationship relationship : typeDescribe.getChildRelationships()){
            String childTypeName = relationship.getChildSObject().getDescribe().getName();
            childTypes.add(relationship.getChildSObject().getDescribe().getName());
        }
        
        return childTypes;
    }

    @AuraEnabled
    public static List<SObject> getRecordsFromType(String typeName, Id parentId){

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

        String query = 'SELECT Id,Name '+
                        'FROM '+typeName+' '+
                        getWhereClause(lookupsToParent, parentId);
        
        return Database.query(query);
    }

    public class FieldDTO{
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String type;

        public FieldDTO(String name, String type){
            this.name = name;
            this.type = type;
        }
    }

    @AuraEnabled
    public static List<FieldDTO> getFieldsFromType(String typeName){
        List<FieldDTO> fields = new List<FieldDTO>();
        SObjectType typeFromName = Schema.getGlobalDescribe().get(typeName);
        Map<String, Schema.SObjectField> fieldTokenByName = typeFromName.getDescribe().fields.getMap();
        for(String fieldName : fieldTokenByName.keyset()){
            fields.add(new FieldDTO(
                fieldName,
                String.valueOf(fieldTokenByName.get(fieldName).getDescribe().getType())
            ));
        }
        return fields;
    }

    private static String getWhereClause(List<String> lookupsToParent, Id parentId){
        
        String whereClause = 'WHERE ';       
        for(String lookup : lookupsToParent){
            whereClause += lookup+' = \''+parentId+'\' OR ';
        }

        return whereClause.removeEnd(' OR ');
    }
}
