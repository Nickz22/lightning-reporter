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
    public static List<SObject> getRecordsFromType(String typeName, Id parentId){
        return Database.query(
            'SELECT Id,Name '+
              'FROM '+typeName+' '+
             'WHERE AccountId = \''+parentId+'\''
        );
    }
}
