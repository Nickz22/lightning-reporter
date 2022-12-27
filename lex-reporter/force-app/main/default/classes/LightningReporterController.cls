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
    public static List<SubjectDTO> getRecordsFromTypeLookingUpToId(String typeName, Id parentId, List<FieldDTO> fieldsToGet){

        List<String> lookupsToParent = getLookupsPointingToParentId(typeName, parentId);

        List<String> fieldApiNames = new List<String>();
        for(FieldDTO field : fieldsToGet){
            fieldApiNames.add(field.name);
        }
        
        String query = 'SELECT '+String.join(fieldApiNames, ',')+',(SELECT '+
                                                                        'Body,CreatedBy.Name,CreatedBy.FullPhotoUrl,CreatedDate '+
                                                                    'FROM Notes ORDER BY CreatedDate desc) '+
                        'FROM '+typeName+' '+
                        getWhereClause(lookupsToParent, parentId)+' '+
                        'ORDER BY LastModifiedDate desc';

        List<SubjectDTO> subjects = new List<SubjectDTO>();
        Map<String, Schema.SObjectField> tokenByFieldName = Schema.getGlobalDescribe()
                                                        .get(typeName)
                                                        .getDescribe().fields.getMap();
        List<SObject> records = Database.query(query);
        Set<String> recordIds = new Set<String>();
        for(SObject record : records){
            recordIds.add(record.Id);
        }
        Map<Id, List<Lightning_Reporter_Note_Metadata__c>> noteMdByParentId = getNoteMdByParentId(recordIds);
        for(SObject record : records){
            for(String field : fieldApiNames){
                // if field is editable and null, explicitly set to `null`
                if(record.get(field) == null && 
                    tokenByFieldName.get(field).getDescribe().isUpdateable()){
                    record.put(field, null);
                }
            }
            subjects.add(
                new SubjectDTO(record, 
                            record.getSObjects('Notes'), 
                            noteMdByParentId.containsKey(record.Id) ? noteMdByParentId.get(record.Id) : new List<Lightning_Reporter_Note_Metadata__c>()
            ));
        }
        
        return subjects;
    }    

    private static Map<Id, List<Lightning_Reporter_Note_Metadata__c>> getNoteMdByParentId(Set<String> recordIds){
        Map<Id, List<Lightning_Reporter_Note_Metadata__c>> noteMdByParentId = new Map<Id, List<Lightning_Reporter_Note_Metadata__c>>();
        for(Lightning_Reporter_Note_Metadata__c noteMd : [SELECT Note_Parent_Id__c, Note_Id__c, Viewed_By__r.FullPhotoUrl,
                                                                Mentioned_User__c, Type__c
                                                            FROM Lightning_Reporter_Note_Metadata__c
                                                            WHERE Note_Parent_Id__c IN :recordIds]){
            if(!noteMdByParentId.containsKey(noteMd.Note_Parent_Id__c)){
                noteMdByParentId.put(noteMd.Note_Parent_Id__c, new List<Lightning_Reporter_Note_Metadata__c>());
            }
            noteMdByParentId.get(noteMd.Note_Parent_Id__c).add(noteMd);
        }
        return noteMdByParentId;
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

        List<LEX_Reporter_Table_Configuration__c> defaultConfig = [SELECT Default_Fieldset__c 
                                                                    FROM LEX_Reporter_Table_Configuration__c
                                                                    WHERE Object__c =: typeName];
        String defaultFields = (
            defaultConfig.isEmpty() ? 
            '' : 
            defaultConfig[0].Default_Fieldset__c
        );

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

    private class SubjectDTO{
        @AuraEnabled public SObject record;
        @AuraEnabled public List<Note> notes;
        @AuraEnabled public Map<Id, List<Lightning_Reporter_Note_Metadata__c>> noteMdByNoteId = new Map<Id, List<Lightning_Reporter_Note_Metadata__c>>();

        public SubjectDTO(SObject record, List<Note> notes, List<Lightning_Reporter_Note_Metadata__c> noteMetadata){
            this.record = record;
            this.notes = notes;
            for(Lightning_Reporter_Note_Metadata__c metadata : noteMetadata){
                if(!this.noteMdByNoteId.containsKey(metadata.Note_Id__c)){
                    this.noteMdByNoteId.put(metadata.Note_Id__c, new List<Lightning_Reporter_Note_Metadata__c>());
                }
                this.noteMdByNoteId.get(metadata.Note_Id__c).add(metadata);
            }
        }
    }
}
