public class LightningReporterController {
    final static String USER_TYPE = 'user';

    @AuraEnabled
    public static Boolean userHasPermission(){
        Boolean hasPermission = false;
        try {
            hasPermission = [SELECT count() 
                               FROM PermissionSetAssignment 
                               WHERE PermissionSet.Name = 'Lightning_Reporter' 
                                    AND AssigneeId = :UserInfo.getUserId()] > 0;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }

        return hasPermission;
    }
    
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
                    if(childOfChild.getChildSObject().getDescribe().getName() == 'Note' && childType.getDescribe().isAccessible()){
                        childTypes.add(childTypeName);
                        break;
                    }
                }
            }   
        } catch (Exception e) {
            throwAuraException(e);
        }
        
        return new List<String>(childTypes);
    }

    @AuraEnabled(cacheable=false)
    public static DTO.ContextDTO getContext(String typeName, Id contextRecordId, List<DTO.FieldDTO> fieldsToGet){
        DTO.ContextDTO context;
        try {
            List<DTO.SubjectDTO> subjects = getRecordsFromTypeLookingUpToId(typeName, contextRecordId, fieldsToGet);
            List<DTO.NoteDTO> alerts = getAlertsForUser(contextRecordId);   

            for(DTO.SubjectDTO subject : subjects){
                for(DTO.NoteDTO note : subject.notes){
                    for(DTO.NoteDTO alert : alerts){
                        if(alert.note.Id == note.note.Id){
                            note.alertRunningUser = true;
                            continue;
                        }
                    }
                }                
            }
            
            context = new DTO.ContextDTO(subjects, alerts);
        } catch (Exception e) {
            throwAuraException(e);
        }
        return context;
    }

    @AuraEnabled(cacheable=true)
    public static List<DTO.TableConfigDTO> getPinnedViews(){
        List<DTO.TableConfigDTO> configs = new List<DTO.TableConfigDTO>();
        try {
            for(Layout_Configuration__c config : new LayoutConfigurationSelector().selectConfigurationsCreatedByCurrentUser()){
                configs.add(new DTO.TableConfigDTO(
                    config.Object__c, 
                    getFieldDTOs(config.Object__c, config.Default_Fieldset__c.split(',')
                )));
            }
        } catch (Exception e) {
            throwAuraException(e);
        }

        return configs;
    }

    @AuraEnabled
    public static List<DTO.FieldDTO> getFieldsFromType(String typeName){

        List<DTO.FieldDTO> fields = new List<DTO.FieldDTO>();
        try {
            fields = getFieldDTOs(typeName, new List<String>());            
        } catch (Exception e) {
            throwAuraException(e);
        }

        return fields;
    }

    @AuraEnabled
    public static void saveRecords(List<SObject> sObjects){
        try{
            for(SObject record : sObjects){
                if(record.getSObjectType().getDescribe().isUpdateable()){
                    continue;
                }else{
                    throw new LightningReporterException('Update denied on ' + record.getSObjectType().getDescribe().getName());
                }
            }
            update SecurityUtil.sanitizeForUpdate(sObjects);
        } catch (Exception e) {
            throwAuraException(e);
        }
    }

    @AuraEnabled
    public static void pinLayout(String objectName, List<DTO.FieldDTO> fields){
        try {
            String commaSeparatedFields = '';
            for(DTO.FieldDTO f : fields){
                commaSeparatedFields += f.name + ',';
            }
            if(Layout_Configuration__c.getSObjectType().getDescribe().isCreateable()){
                insert new Layout_Configuration__c(
                    Object__c = objectName,
                    Default_Fieldset__c = commaSeparatedFields.removeEnd(',')
                );
            }else{
                throw new LightningReporterException('Creation of Lightning Reporter Layout Configuration denied.');
            }
        } catch (Exception e) {
            throwAuraException(e);
        }
    }

    @AuraEnabled
    public static void deletePin(String objectName){
        try {
            Layout_Configuration__c config = new LayoutConfigurationSelector().selectConfigurationByObjectAndCreatedByCurrentUser(objectName)[0];
            if(Layout_Configuration__c.getSObjectType().getDescribe().isDeletable()){
                delete config;
            }else{
                throw new LightningReporterException('Deletion of Lightning Reporter Layout Configuration denied.');
            }
        } catch (Exception e) {
            throwAuraException(e);
        }
    }

    // helpers
    private static List<DTO.NoteDTO> getAlertsForUser(Id contextRecordId){

        List<Note_Metadata__c> noteMd = new NoteMetadataSelector().selectByContextIdAndViewedOrMentionedByCurrentUser(contextRecordId);
        
        Set<Id> noteIds = new Set<Id>();
        for(Note_Metadata__c md : noteMd){
            noteIds.add((Id)md.Note_Id__c);
        }

        List<Note> notes = new NoteSelector().selectByIds(noteIds);
        Map<Id, List<Note>> notesByParentId = new Map<Id, List<Note>>();
        Map<Id, Note> noteById = new Map<Id, Note>();
        for(Note n : notes){
            noteById.put(n.Id, n);
            if(!notesByParentId.containsKey(n.ParentId)){
                notesByParentId.put(n.ParentId, new List<Note>());
            }
            notesByParentId.get(n.ParentId).add(n);
        }

        Map<Id, List<Note_Metadata__c>> noteMdByNoteParentId = new Map<Id, List<Note_Metadata__c>>();
        for(Note_Metadata__c md : noteMd){
            if(!noteMdByNoteParentId.containsKey(noteById.get((Id)md.Note_Id__c).ParentId)){
                noteMdByNoteParentId.put(noteById.get(md.Note_Id__c).ParentId, new List<Note_Metadata__c>());
            }
            noteMdByNoteParentId.get(noteById.get(md.Note_Id__c).ParentId).add(md);
        }
        
        List<Note_Metadata__c> alerts = new List<Note_Metadata__c>();
        Set<Id> alertIds = new Set<Id>();
        Set<Id> viewedNoteIds = new Set<Id>();
        for(Id noteParentId : notesByParentId.keyset()){
            for(Note_Metadata__c md : noteMdByNoteParentId.get(noteParentId)){
                if(md.Type__c == 'View'){
                    viewedNoteIds.add(md.Note_Id__c);
                }else if(md.Mentioned_User__c == UserInfo.getUserId() && !viewedNoteIds.contains(md.Note_Id__c)){
                    alerts.add(md);
                    alertIds.add(md.Note_Id__c);
                }
            }
        }

        return getNoteDtos(new NoteSelector().selectByIds(alertIds), alerts);
    }

    private static List<DTO.SubjectDTO> getRecordsFromTypeLookingUpToId(String typeName, Id contextRecordId, List<DTO.FieldDTO> fieldsToGet){

        List<DTO.SubjectDTO> subjects = new List<DTO.SubjectDTO>();
        List<String> lookupsToParent = getLookupFieldsPointingToParentId(typeName, contextRecordId);
        Map<String, Schema.SObjectField> fieldsMap = Cache.globalDescribe.get(typeName).getDescribe().fields.getMap();
        List<String> fieldApiNames = new List<String>();
        for(DTO.FieldDTO field : fieldsToGet){
            fieldApiNames.add(field.name);
            if(field.type == 'reference' && 
                fieldsMap.get(field.name)
                    .getDescribe()
                    .getReferenceTo()[0]
                    .getDescribe()
                    .fields.getMap().containsKey('Name') &&
                typeName.toLowerCase() != 'opportunity' && field.name.toLowerCase() != 'contactid' &&
                fieldsMap.get(field.name).getDescribe().isAccessible()){
                    
                // replace last instance of 'id' in field.name with '.name'
                String lookupNameField = field.isCustom ? 
                                            field.name.toLowerCase().replace('__c', '__r.name') : 
                                            field.name.substring(0, field.name.length()-2)+'.Name';
                fieldApiNames.add(lookupNameField);
            }
        }
        if(fieldsMap.containsKey('Name') && !fieldApiNames.contains('Name')){
            fieldApiNames.add('Name');
        }
        String whereClause = getWhereClause(lookupsToParent, contextRecordId);

        String query = 'SELECT '+String.join(fieldApiNames, ',')+',(SELECT '+
                                                                        'Body,CreatedBy.Name,CreatedBy.FullPhotoUrl,CreatedDate,ParentId '+
                                                                    'FROM Notes ORDER BY CreatedDate desc) '+
                        'FROM '+typeName+' '+
                        whereClause+' '+
                        'ORDER BY LastModifiedDate desc';
        System.debug(query);

        List<SObject> records = Database.query(query);
        Set<String> recordIds = new Set<String>();
        Map<String, Schema.SObjectField> tokenByFieldName = Cache.globalDescribe
                                                            .get(typeName)
                                                            .getDescribe()
                                                            .fields.getMap();
        for(SObject record : records){
            recordIds.add(record.Id);
        }
        Map<Id, List<Note_Metadata__c>> noteMdByParentId = getNoteMdByParentId(recordIds);
        for(SObject record : records){
            subjects.add(new DTO.SubjectDTO(
                record, 
                getNoteDtos(
                    record.getSObjects('Notes'), 
                    noteMdByParentId.containsKey(record.Id) ? 
                        noteMdByParentId.get(record.Id) : 
                        new List<Note_Metadata__c>()
            )));
        }

        return subjects;
    }    

    private static List<DTO.NoteDTO> getNoteDtos(List<Note> notes, List<Note_Metadata__c> noteMetadata){
        List<DTO.NoteDTO> noteDtos = new List<DTO.NoteDTO>();
        Map<Id, List<Note_Metadata__c>> noteMdByNoteId = new Map<Id, List<Note_Metadata__c>>();
        for(Note_Metadata__c metadata : noteMetadata){
            if(!noteMdByNoteId.containsKey(metadata.Note_Id__c)){
                noteMdByNoteId.put(metadata.Note_Id__c, new List<Note_Metadata__c>());
            }
            noteMdByNoteId.get(metadata.Note_Id__c).add(metadata);
        }
        if(notes != null && !notes.isEmpty()){
            for(Note note : notes){
                noteDtos.add(new DTO.NoteDTO(
                    note, 
                    noteMdByNoteId.containsKey(note.Id) ? 
                    noteMdByNoteId.get(note.Id) : 
                    new List<Note_Metadata__c>()
                ));
            }
        }
        return noteDtos;    
    }

    private static String getWhereClause(List<String> lookupsToParent, Id parentId){
        
        String whereClause = 'WHERE ';       
        for(String lookup : lookupsToParent){
            whereClause += lookup+' = \''+parentId+'\' OR ';
        }

        return whereClause.removeEnd(' OR ');
    }

    private static List<String> getLookupFieldsPointingToParentId(String childTypeName, Id parentId){

        List<String> lookupsToParent = new List<String>();
        Map<String, Schema.SObjectField> fieldTokenByName = Cache.globalDescribe
                                                            .get(childTypeName)
                                                            .getDescribe()
                                                            .fields.getMap();
        for(String fieldName : fieldTokenByName.keyset()){
            DescribeFieldResult fieldDescribe = fieldTokenByName.get(fieldName).getDescribe();

            if(fieldDescribe.getType() == Schema.DisplayType.REFERENCE){ 
                SObjectType lookupTargetType = fieldDescribe.getReferenceTo()?.get(0); 
                if(lookupTargetType == null){ // null for `masterrecordid` field
                    continue; 
                }
                if(lookupTargetType.getDescribe().getName() == parentId.getSobjectType().getDescribe().getName() // is the field lookup to `parentId`
                    && fieldDescribe.isAccessible()){ 
                    lookupsToParent.add(fieldName);
                }
            }
        }   

        return lookupsToParent;
    }

    private static Map<Id, List<Note_Metadata__c>> getNoteMdByParentId(Set<String> recordIds){
        Map<Id, List<Note_Metadata__c>> noteMdByParentId = new Map<Id, List<Note_Metadata__c>>();
        for(Note_Metadata__c noteMd : new NoteMetadataSelector().selectByNoteParentIds(recordIds)){
            if(!noteMdByParentId.containsKey(noteMd.Note_Parent_Id__c)){
                noteMdByParentId.put(noteMd.Note_Parent_Id__c, new List<Note_Metadata__c>());
            }
            noteMdByParentId.get(noteMd.Note_Parent_Id__c).add(noteMd);
        }
        return noteMdByParentId;
    }

    private static List<DTO.FieldDTO> getFieldDTOs(String objectname, List<String> fieldNamesToDto){

        SObjectType sObjType = Cache.globalDescribe.get(objectname);
        DescribeSObjectResult d = sObjType.getDescribe();
        Map<String, SObjectField> fieldTokenByApiName = d.fields.getMap();
        List<String> allFieldNames = new List<String>(fieldTokenByApiName.keyset());
        allFieldNames.sort();
        List<DTO.FieldDTO> fields = new List<DTO.FieldDTO>();

        if(fieldNamesToDto.isEmpty()){
            for(String fieldName : allFieldNames){
                DescribeFieldResult describe = fieldTokenByApiName.get(fieldName).getDescribe();
                DTO.FieldDTO dto = new DTO.FieldDTO(
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
                DTO.FieldDTO dto = new DTO.FieldDTO(
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

    private static void throwAuraException(Exception e){
        AuraHandledException ae = new AuraHandledException(e.getMessage() + '['+e.getStackTraceString()+']');
        ae.setMessage(e.getMessage() + '['+e.getStackTraceString()+']');
        throw ae;
    }
}