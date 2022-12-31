public class LightningReporterController {
    final static String USER_TYPE = 'user';
    /**
     * should prioritize objects for which views have been saved 
     * only gets child types with `Notes` child relationship
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getChildTypes(Id recordId){
        Set<String> childTypes = new Set<String>();
        try {
            DescribeSObjectResult typeDescribe = recordId.getSobjectType().getDescribe();
            for(Schema.ChildRelationship relationship : typeDescribe.getChildRelationships()){
                SObjectType childType = relationship.getChildSObject();
                String childTypeName = childType.getDescribe().getName();
                if(childTypeName.toLowerCase() == USER_TYPE){ 
                    continue; 
                }
                for(Schema.ChildRelationship childOfChild : childType.getDescribe().getChildRelationships()){
                    if(childOfChild.getChildSObject().getDescribe().getName() == 'Note'){
                        childTypes.add(childTypeName);
                        break;
                    }
                }
                if(childTypes.contains(childTypeName)){
                    continue;
                }
            }   
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        
        return new List<String>(childTypes);
    }

    static List<String> getLookupFieldsPointingToParentId(String childTypeName, Id parentId){

        List<String> lookupsToParent = new List<String>();
        try {
            Map<String, Schema.SObjectField> fieldTokenByName = Schema.getGlobalDescribe()
                                                                .get(childTypeName)
                                                                .getDescribe()
                                                                .fields.getMap();
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
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }

        return lookupsToParent;
    }

    @AuraEnabled(cacheable=true)
    public static List<SubjectDTO> getRecordsFromTypeLookingUpToId(String typeName, Id parentId, List<FieldDTO> fieldsToGet){

        List<SubjectDTO> subjects = new List<SubjectDTO>();
        try {
            List<String> lookupsToParent = getLookupFieldsPointingToParentId(typeName, parentId);
            Map<String, Schema.SObjectField> fieldsMap = Cache.globalDescribe.get(typeName).getDescribe().fields.getMap();
            List<String> fieldApiNames = new List<String>();
            if(fieldsMap.containsKey('Name')){
                fieldApiNames.add('Name');
            }
            for(FieldDTO field : fieldsToGet){
                fieldApiNames.add(field.name);
                if(field.type == 'reference' && 
                    fieldsMap.get(field.name)
                        .getDescribe()
                        .getReferenceTo()[0]
                        .getDescribe()
                        .fields.getMap().containsKey('Name') &&
                    typeName.toLowerCase() != 'opportunity' && field.name.toLowerCase() != 'contactid'){
                    String lookupNameField = field.isCustom ? 
                        field.name.toLowerCase().replace('__c', '__r.name') : 
                        field.name.toLowerCase().replace('id', '.name');
                    fieldApiNames.add(lookupNameField);
                }
            }
            
            String query = 'SELECT '+String.join(fieldApiNames, ',')+',(SELECT '+
                                                                            'Body,CreatedBy.Name,CreatedBy.FullPhotoUrl,CreatedDate '+
                                                                        'FROM Notes ORDER BY CreatedDate desc) '+
                            'FROM '+typeName+' '+
                            getWhereClause(lookupsToParent, parentId)+' '+
                            'ORDER BY LastModifiedDate desc';
            System.debug(query);

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
                    if(field.contains('.')){
                        continue;
                    }
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
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage()+ '['+e.getStackTraceString()+']');
        }

        return subjects;
    }    

    @AuraEnabled(cacheable=true)
    public static List<TableConfigDTO> getPinnedViews(){
        List<TableConfigDTO> configs = new List<TableConfigDTO>();
        try {

            List<LEX_Reporter_Table_Configuration__c> tableConfigs = [SELECT Object__c,Default_Fieldset__c
                                                                        FROM LEX_Reporter_Table_Configuration__c
                                                                        WHERE CreatedById = :UserInfo.getUserId()
                                                                        ORDER BY CreatedDate ASC];

            for(LEX_Reporter_Table_Configuration__c config : tableConfigs){
                configs.add(new TableConfigDTO(
                    config.Object__c, 
                    getFieldDtos(config.Object__c, config.Default_Fieldset__c.split(',')
                )));
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }

        return configs;
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

    @AuraEnabled
    public static List<FieldDTO> getFieldsFromType(String typeName){

        List<FieldDTO> fields = new List<FieldDTO>();
        try {
    
            List<LEX_Reporter_Table_Configuration__c> defaultConfig = [SELECT Default_Fieldset__c 
                                                                        FROM LEX_Reporter_Table_Configuration__c
                                                                        WHERE Object__c =: typeName];
            String defaultFields = (
                defaultConfig.isEmpty() ? 
                '' : 
                defaultConfig[0].Default_Fieldset__c
            );
    
            fields = getFieldDtos(typeName, new List<String>());            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }

        return fields;
    }

    private static List<FieldDTO> getFieldDtos(String objectname, List<String> fieldNamesToDto){

        SObjectType sObjType = Cache.globalDescribe.get(objectname);
        DescribeSObjectResult d = sObjType.getDescribe();
        Map<String, SObjectField> fieldTokenByApiName = d.fields.getMap();
        List<String> allFieldNames = new List<String>(fieldTokenByApiName.keyset());
        allFieldNames.sort();
        List<FieldDTO> fields = new List<FieldDTO>();

        if(fieldNamesToDto.isEmpty()){
            for(String fieldName : allFieldNames){
                DescribeFieldResult describe = fieldTokenByApiName.get(fieldName).getDescribe();
                FieldDTO dto = new FieldDTO(
                    describe.getName(),
                    describe.getLabel(),
                    String.valueOf(describe.getType()),
                    describe.isUpdateable(),
                    false,
                    describe.isCustom()
                );
                fields.add(dto);
            }
        }else{
            fieldNamesToDto.sort();
            for(String fieldToDto : fieldNamesToDto){
                DescribeFieldResult describe = fieldTokenByApiName.get(fieldToDto).getDescribe();
                FieldDTO dto = new FieldDTO(
                    describe.getName(),
                    describe.getLabel(),
                    String.valueOf(describe.getType()),
                    describe.isUpdateable(),
                    true,
                    describe.isCustom()
                );
                fields.add(dto);
            }
        }

        return fields;
    }

    @AuraEnabled
    public static void saveRecords(List<SObject> sObjects){
        List<Database.SaveResult> results = Database.update(sObjects, false);
    }

    @AuraEnabled
    public static void pinLayout(String objectName, List<FieldDTO> fields){
        try {
            String commaSeparatedFields = '';
            for(FieldDTO f : fields){
                commaSeparatedFields += f.name + ',';
            }
            insert new LEX_Reporter_Table_Configuration__c(
                Object__c = objectName,
                Default_Fieldset__c = commaSeparatedFields.removeEnd(',')
            );
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void deletePin(String objectName){
        try {
            Lex_Reporter_Table_Configuration__c config = [SELECT Id FROM Lex_Reporter_Table_Configuration__c
                                                            WHERE Object__c =: objectName
                                                            AND CreatedById =: UserInfo.getUserId()
                                                            LIMIT 1];
            delete config;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // helpers
    private static String getWhereClause(List<String> lookupsToParent, Id parentId){
        
        String whereClause = 'WHERE ';       
        for(String lookup : lookupsToParent){
            whereClause += lookup+' = \''+parentId+'\' OR ';
        }

        return whereClause.removeEnd(' OR ');
    }

    public class FieldDTO{
        @AuraEnabled public String name {get; set;}
        @AuraEnabled public String label {get; set;}
        @AuraEnabled public String type {get; set;}
        @AuraEnabled public Boolean isUpdateable {get; set;}
        @AuraEnabled public Boolean defaultSelected {get; set;}
        @AuraEnabled public Boolean isCustom {get; set;}

        public FieldDTO(String name, String label, String type, Boolean isUpdateable, Boolean defaultSelected, Boolean isCustom){
            this.name = name;
            this.label = label;
            this.type = type;
            this.isUpdateable = isUpdateable;
            this.defaultSelected = defaultSelected;
            this.isCustom = isCustom;
        }

        public FieldDTO(){}
    }

    private class SubjectDTO {
        @AuraEnabled public SObject record;
        @AuraEnabled public List<NoteDTO> notes = new List<NoteDTO>();

        public SubjectDTO(SObject record, List<Note> notes, List<Lightning_Reporter_Note_Metadata__c> noteMetadata){
            this.record = record;
            Map<Id, List<Lightning_Reporter_Note_Metadata__c>> noteMdByNoteId = new Map<Id, List<Lightning_Reporter_Note_Metadata__c>>();
            for(Lightning_Reporter_Note_Metadata__c metadata : noteMetadata){
                if(!noteMdByNoteId.containsKey(metadata.Note_Id__c)){
                    noteMdByNoteId.put(metadata.Note_Id__c, new List<Lightning_Reporter_Note_Metadata__c>());
                }
                noteMdByNoteId.get(metadata.Note_Id__c).add(metadata);
            }
            if(notes != null && !notes.isEmpty()){
                for(Note note : notes){
                    this.notes.add(new NoteDTO(note, noteMdByNoteId.get(note.Id)));
                }
            }
        }
    }

    private class NoteDTO{
        @AuraEnabled public Note note;
        @AuraEnabled public List<Lightning_Reporter_Note_Metadata__c> views = new List<Lightning_Reporter_Note_Metadata__c>();
        @AuraEnabled public Boolean alertRunningUser;

        public NoteDTO(Note note, List<Lightning_Reporter_Note_Metadata__c> metadata){
            this.note = note;
            Set<Id> mentionedUserIds = new Set<Id>();
            Set<Id> viewedByUserIds = new Set<Id>();
            for(Lightning_Reporter_Note_Metadata__c md : metadata){
                if(md.Mentioned_User__c != null){
                    mentionedUserIds.add(md.Mentioned_User__c);
                }
                if(md.Viewed_By__c != null){ // we only need views for FE
                    viewedByUserIds.add(md.Viewed_By__c);
                    views.add(md);
                }
            }
            this.alertRunningUser = mentionedUserIds.contains(UserInfo.getUserId()) && !viewedByUserIds.contains(UserInfo.getUserId());
        }
    }

    public class TableConfigDTO{
        @AuraEnabled public String objectName {get;set;}
        @AuraEnabled public List<FieldDTO> defaultFields {get;set;}

        public TableConfigDTO(String objectName, List<FieldDTO> defaultFields){
            this.objectName = objectName;
            this.defaultFields = defaultFields;
        }

        public Lex_Reporter_Table_Configuration__c convertToDbModel(){
            Lex_Reporter_Table_Configuration__c tableConfig = new Lex_Reporter_Table_Configuration__c();
            tableConfig.Object__c = this.objectName;
            String defaultFields = '';
            for(FieldDTO f : this.defaultFields){
                defaultFields += f.name + ',';
            }
            tableConfig.Default_Fieldset__c = defaultFields.removeEnd(',');
            return tableConfig;
        }
    }
}