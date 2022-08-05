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
    public static List<SObject> getRecordsFromType(String typeName, Id parentId, List<String> fieldsToGet){

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

        String query = 'SELECT '+String.join(fieldsToGet, ',')+' '+
                        'FROM '+typeName+' '+
                        getWhereClause(lookupsToParent, parentId);
        
        return Database.query(query);
    }    

    public class FieldDTO{
        @AuraEnabled public String name;
        @AuraEnabled public String type;
        @AuraEnabled public Boolean defaultSelected = false;

        public FieldDTO(String name, String type){
            this.name = name;
            this.type = type;
            this.defaultSelected = (name == 'Id' || name == 'Name');
        }
    }

    @AuraEnabled
    public static List<FieldDTO> getFieldsFromType(String typeName){

        List<FieldDTO> fields = new List<FieldDTO>();
        SObjectType typeFromName = Schema.getGlobalDescribe().get(typeName);
        Map<String, Schema.SObjectField> fieldTokenByName = typeFromName.getDescribe().fields.getMap();
        List<String> iterableFieldNames = new List<String>(fieldTokenByName.keyset());
        iterableFieldNames.sort();

        for(String fieldName : iterableFieldNames){
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

    @AuraEnabled
    public static void updateRecords(List<SObject> sObjects){
        System.debug('logging update targets');
        for(SObject sobj : sObjects){
            System.debug(
                JSON.serialize(sobj)
            );
        }
    }
}
