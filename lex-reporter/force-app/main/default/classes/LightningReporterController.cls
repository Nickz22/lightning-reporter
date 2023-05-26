public class LightningReporterController {
  final static String USER_TYPE = 'user';

  @AuraEnabled
  public static Boolean userHasPermission() {
    Boolean hasPermission = false;
    try {
      hasPermission =
        [
          SELECT COUNT()
          FROM PermissionSetAssignment
          WHERE
            PermissionSet.Name = :C.LIGHTNING_REPORTER_PERMISSION
            AND AssigneeId = :UserInfo.getUserId()
        ] > 0;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }

    return hasPermission;
  }

  @AuraEnabled(cacheable=true)
  public static List<String> getChildTypes(Id recordId) {
    Set<String> childTypes = new Set<String>();
    try {
      DescribeSObjectResult typeDescribe = recordId.getSobjectType()
        .getDescribe();
      for (
        Schema.ChildRelationship relationship : typeDescribe.getChildRelationships()
      ) {
        SObjectType childType = relationship.getChildSObject();
        String childTypeName = childType.getDescribe().getName();
        if (childTypeName.toLowerCase() == USER_TYPE) {
          continue;
        }
        for (
          Schema.ChildRelationship childOfChild : childType.getDescribe()
            .getChildRelationships()
        ) {
          if (
            childOfChild.getChildSObject().getDescribe().getName() == 'Note' &&
            childType.getDescribe().isAccessible()
          ) {
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
  public static ContextDTO getContext(
    String typeName,
    Id contextRecordId,
    List<FieldDTO> fieldsToGet
  ) {
    ContextDTO context;
    try {
      List<SubjectDTO> subjects = getRecordsFromTypeLookingUpToId(
        typeName,
        contextRecordId,
        fieldsToGet
      );
      List<NoteDTO> alerts = getAlertsForUser(contextRecordId);

      for (SubjectDTO subject : subjects) {
        for (NoteDTO note : subject.notes) {
          for (NoteDTO alert : alerts) {
            if (alert.note.Id == note.note.Id) {
              note.alertRunningUser = true;
              continue;
            }
          }
        }
      }

      context = new ContextDTO(subjects, alerts);
    } catch (Exception e) {
      throwAuraException(e);
    }
    return context;
  }

  @AuraEnabled
  public static TableViewDTO insertTableView(TableViewDTO tableViewDto) {
    TableViewDTO viewDto;
    try {
      Table_View__c view = tableViewDto.convertToDbModel();
      view.Viewer__c = UserInfo.getUserId();
      insert view;
      viewDto = new TableViewDTO(view);
    } catch (Exception e) {
      throw e;
    }

    return viewDto;
  }

  @AuraEnabled
  public static TableViewDTO getLastTableView(String contextId) {
    List<Table_View__c> lastView;
    try {
      lastView = [
        SELECT
          Id,
          Viewer__c,
          Context_Id__c,
          Object_Name__c,
          State__c,
          Skinny_State__c
        FROM Table_View__c
        WHERE Context_Id__c = :contextId AND Viewer__c = :UserInfo.getUserId()
        ORDER BY CreatedDate DESC
        LIMIT 1
      ];
    } catch (Exception e) {
      throw e;
    }

    return new TableViewDTO(
      lastView.isEmpty() ? new Table_View__c() : lastView[0]
    );
  }

  @AuraEnabled
  public static String getGptResponse(List<Map<String, String>> messages) {
    HttpRequest req = new HttpRequest();
    req.setEndpoint('https://api.openai.com/v1/chat/completions');
    req.setMethod('POST');
    req.setHeader('Content-Type', 'application/json');
    req.setHeader(
      'Authorization',
      'Bearer ' + OpenAi__c.getOrgDefaults().Key__c
    );
    req.setTimeout(120000);

    String body =
      '{"model": "gpt-3.5-turbo", "messages": ' +
      JSON.serialize(messages) +
      ', "temperature": 1.1}';
    req.setBody(body);

    Http http = new Http();
    HTTPResponse res = http.send(req);
    GptResponse response = (GptResponse) JSON.deserialize(
      res.getBody(),
      GptResponse.class
    );
    return response.choices[0].message.content;
  }

  @AuraEnabled
  public static String gptGetTableViewDelta(
    TableViewDTO compareView,
    TableViewDTO newView
  ) {
    // Initialize the list of messages with a system message
    List<Map<String, String>> messages = new List<Map<String, String>>{
      new Map<String, String>{
        'role' => 'system',
        'content' => 'You are an expert data analyst, specifically in Salesforce databases.'
      }
    };

    // List of user prompts for the GPT API
    List<String> prompts = new List<String>{
      'Your task is to receive two snapshots of the ' +
      newView.objectName +
      ' table at different points in time, and detect deltas from the first snapshot to the second snapshot.',
      'Here is the first snapshot: ' + compareView.state,
      'Here is the second snapshot: ' + newView.state,
      'Please provide analysis on the delta between both datasets.'
    };

    // Iterate through the prompts and call the GPT API for each of them
    for (String prompt : prompts) {
      // Add the user message to the list of messages
      messages.add(
        new Map<String, String>{ 'role' => 'user', 'content' => prompt }
      );

      // Get the assistant's response
      String response = getGptResponse(messages);

      // Add the assistant's response to the list of messages
      messages.add(
        new Map<String, String>{ 'role' => 'assistant', 'content' => response }
      );

      System.debug(response);
    }

    // The final assistant's response is the analysis of the delta
    return messages.get(messages.size() - 1).get('content');
  }

  @AuraEnabled
  public static String gptDetectAnomalies(
    List<Id> idsToSummarize,
    List<FieldDTO> fieldsToSummarize
  ) {
    String query = 'SELECT ';
    List<String> fields = new List<String>();
    for (FieldDTO field : fieldsToSummarize) {
      fields.add(field.name);
    }
    query += String.join(fields, ', ');

    query +=
      ' FROM ' + idsToSummarize[0].getSObjectType().getDescribe().getName();
    query += ' WHERE Id IN :idsToSummarize';
    system.debug(query);
    HttpRequest req = new HttpRequest();
    req.setEndpoint('https://api.openai.com/v1/chat/completions');
    req.setMethod('POST');
    req.setHeader('Content-Type', 'application/json');
    req.setHeader(
      'Authorization',
      'Bearer ' + OpenAi__c.getOrgDefaults().Key__c
    );
    req.setTimeout(120000);

    List<SObject> records = Database.query(query);
    String prompt =
      'You are an expert data analyst. Summarize these Salesforce records - highlight anomalies and patterns: ' +
      records;
    req.setBody(
      '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "' +
      prompt +
      '"}], "temperature": 1.1}'
    );

    System.debug(req.getBody());

    Http http = new Http();
    HTTPResponse res = http.send(req);
    System.debug(res.getBody());
    GptResponse response = (GptResponse) JSON.deserialize(
      res.getBody(),
      GptResponse.class
    );
    return response.choices[0].message.content;
  }

  /**
   * might be useful later but too much trouble to query via natural language for now
   */
  // @AuraEnabled
  // public static ContextDTO filterByNaturalLanguage(
  //   String naturalQueryString,
  //   Id contextRecordId,
  //   List<FieldDTO> fieldsToGet,
  //   String objectToQuery
  // ) {
  //   // Initialize the list of messages with a system message
  //   List<Map<String, String>> messages = new List<Map<String, String>>{
  //     new Map<String, String>{
  //       'role' => 'system',
  //       'content' => 'You are a GPT-4 AI model trained to interpret natural language queries into SOQL queries based on specific guidelines.'
  //     }
  //   };

  //   // List of user prompts for the GPT API
  //   List<String> prompts = new List<String>{
  //     'Your task is to receive a natural language query and convert it into a SOQL query on the ' +
  //     objectToQuery +
  //     ' object.',
  //     'The query should follow these guidelines' +
  //     ' (1) the current year, month and day is ' +
  //     System.now().year() +
  //     '/' +
  //     System.now().month() +
  //     '/' +
  //     System.now().day() +
  //     ' (2) owner filters should only filter by non-ID fields, such as Name, Profile or Role, and should only be included if the natural language phrase explicitly contains "owned by"' +
  //     ' (3) any reference to a "state", "city" or "country" should use "billingstate", "billingcity" or "billingcountry" respectively' +
  //     ' (4) if the natural language phrase includes "me" or "my", you should interpet that as a filter on OwnerId=\'' +
  //     UserInfo.getUserId() +
  //     '\'' +
  //     ' (5) omit query modifiers other than the WHERE clause, such as ORDER BY ' +
  //     ' (6) any date filters should be converted to the format YYYY-MM-DDT00:00:00Z' +
  //     ' (7) any use of the word "next" or "last" should use salesforce date literals, such as NEXT_N_DAYS:7 or LAST_N_DAYS:7',
  //     'Here is the natural language query to convert into a SOQL query on the ' +
  //     objectToQuery +
  //     ' object: ' +
  //     naturalQueryString
  //   };

  //   // Iterate through the prompts and call the GPT API for each of them
  //   for (String prompt : prompts) {
  //     // Add the user message to the list of messages
  //     messages.add(
  //       new Map<String, String>{ 'role' => 'user', 'content' => prompt }
  //     );

  //     // Get the assistant's response
  //     String response = getGptResponse(messages);

  //     // Add the assistant's response to the list of messages
  //     messages.add(
  //       new Map<String, String>{ 'role' => 'assistant', 'content' => response }
  //     );

  //     System.debug(response);
  //   }

  //   // The final assistant's response is the SOQL query
  //   String gptSoql = messages.get(messages.size() - 1).get('content');
  //   System.debug('gptSoql: ' + gptSoql);
  //   String gptWhereClause = gptSoql.substringAfter('WHERE').trim();
  //   System.debug('gptWhereClause: ' + gptWhereClause);
  //   String queryObject = gptSoql.substringBetween('FROM', 'WHERE').trim();
  //   // get selected fields and filter by context record
  //   String contextSoql = getContextQueryString(
  //     queryObject,
  //     contextRecordId,
  //     fieldsToGet
  //   );
  //   System.debug('contextSoql: ' + contextSoql);
  //   // inject gptWhereClause+" AND "+ into contextSoql after "WHERE"
  //   String finalSoql =
  //     contextSoql.substringBefore('WHERE') +
  //     'WHERE ' +
  //     gptWhereClause +
  //     ' AND ' +
  //     contextSoql.substringAfter('WHERE');
  //   if (finalSoql.contains('```')) {
  //     finalSoql = finalSoql.substringBefore('```').trim(); // gpt keeps elaborating on the query
  //   }
  //   System.debug('finalSoql' + finalSoql);
  //   List<SObject> records = Database.query(finalSoql);
  //   Set<String> recordIds = new Set<String>();
  //   Map<String, Schema.SObjectField> tokenByFieldName = Cache.globalDescribe
  //     .get(queryObject)
  //     .getDescribe()
  //     .fields.getMap();
  //   for (SObject record : records) {
  //     recordIds.add(record.Id);
  //   }
  //   Map<Id, List<Note_Metadata__c>> noteMdByParentId = getNoteMdByParentId(
  //     recordIds
  //   );
  //   List<SubjectDTO> subjects = new List<SubjectDTO>();
  //   for (SObject record : records) {
  //     subjects.add(
  //       new SubjectDTO(
  //         record,
  //         getNoteDtos(
  //           record.getSObjects('Notes'),
  //           noteMdByParentId.containsKey(record.Id)
  //             ? noteMdByParentId.get(record.Id)
  //             : new List<Note_Metadata__c>()
  //         )
  //       )
  //     );
  //   }

  //   List<NoteDTO> alerts = getAlertsForUser(contextRecordId);

  //   for (SubjectDTO subject : subjects) {
  //     for (NoteDTO note : subject.notes) {
  //       for (NoteDTO alert : alerts) {
  //         if (alert.note.Id == note.note.Id) {
  //           note.alertRunningUser = true;
  //           continue;
  //         }
  //       }
  //     }
  //   }

  //   return new ContextDTO(subjects, alerts);
  // }

  @AuraEnabled(cacheable=true)
  public static List<TableConfigDTO> getPinnedViews() {
    List<TableConfigDTO> configs = new List<TableConfigDTO>();
    try {
      for (
        Layout_Configuration__c config : new LayoutConfigurationSelector()
          .selectConfigurationsCreatedByCurrentUser()
      ) {
        configs.add(
          new TableConfigDTO(
            config.Object__c,
            getFieldDTOs(
              config.Object__c,
              config.Default_Fieldset__c.split(',')
            )
          )
        );
      }
    } catch (Exception e) {
      throwAuraException(e);
    }

    return configs;
  }

  @AuraEnabled
  public static List<FieldDTO> getFieldsFromType(String typeName) {
    List<FieldDTO> fields = new List<FieldDTO>();
    try {
      fields = getFieldDTOs(typeName, new List<String>());
    } catch (Exception e) {
      throwAuraException(e);
    }

    return fields;
  }

  @AuraEnabled
  public static void saveRecords(List<SObject> sObjects) {
    try {
      insert new Usage_Metric__c(
        Action__c = C.USAGE_SAVE,
        Object__c = sObjects[0]?.Id?.getSObjectType()?.getDescribe()?.getName()
      );
      for (SObject record : sObjects) {
        if (record.getSObjectType().getDescribe().isUpdateable()) {
          continue;
        } else {
          throw new LightningReporterException(
            'Update denied on ' +
            record.getSObjectType().getDescribe().getName()
          );
        }
      }
      update SecurityUtil.sanitizeForUpdate(sObjects);
    } catch (Exception e) {
      throwAuraException(e);
    }
  }

  @AuraEnabled
  public static void pinLayout(String objectName, List<FieldDTO> fields) {
    try {
      String commaSeparatedFields = '';
      for (FieldDTO f : fields) {
        commaSeparatedFields += f.name + ',';
      }
      if (
        Layout_Configuration__c.getSObjectType().getDescribe().isCreateable()
      ) {
        insert new Layout_Configuration__c(
          Object__c = objectName,
          Default_Fieldset__c = commaSeparatedFields.removeEnd(',')
        );
        insert new Usage_Metric__c(
          Action__c = C.USAGE_PIN,
          Object__c = objectName
        );
      } else {
        throw new LightningReporterException(
          'Creation of Lightning Reporter Layout Configuration denied.'
        );
      }
    } catch (Exception e) {
      throwAuraException(e);
    }
  }

  @AuraEnabled
  public static void deletePin(String objectName) {
    try {
      Layout_Configuration__c config = new LayoutConfigurationSelector()
        .selectConfigurationByObjectAndCreatedByCurrentUser(objectName)[0];
      if (
        Layout_Configuration__c.getSObjectType().getDescribe().isDeletable()
      ) {
        delete config;
      } else {
        throw new LightningReporterException(
          'Deletion of Lightning Reporter Layout Configuration denied.'
        );
      }
    } catch (Exception e) {
      throwAuraException(e);
    }
  }

  // helpers
  private static List<NoteDTO> getAlertsForUser(Id contextRecordId) {
    List<Note_Metadata__c> noteMd = new NoteMetadataSelector()
      .selectByContextIdAndViewedOrMentionedByCurrentUser(contextRecordId);

    Set<Id> noteIds = new Set<Id>();
    for (Note_Metadata__c md : noteMd) {
      noteIds.add((Id) md.Note_Id__c);
    }

    List<Note> notes = new NoteSelector().selectByIds(noteIds);
    Map<Id, List<Note>> notesByParentId = new Map<Id, List<Note>>();
    Map<Id, Note> noteById = new Map<Id, Note>();
    for (Note n : notes) {
      noteById.put(n.Id, n);
      if (!notesByParentId.containsKey(n.ParentId)) {
        notesByParentId.put(n.ParentId, new List<Note>());
      }
      notesByParentId.get(n.ParentId).add(n);
    }

    Map<Id, List<Note_Metadata__c>> noteMdByNoteParentId = new Map<Id, List<Note_Metadata__c>>();
    for (Note_Metadata__c md : noteMd) {
      if (
        !noteMdByNoteParentId.containsKey(
          noteById.get((Id) md.Note_Id__c).ParentId
        )
      ) {
        noteMdByNoteParentId.put(
          noteById.get(md.Note_Id__c).ParentId,
          new List<Note_Metadata__c>()
        );
      }
      noteMdByNoteParentId.get(noteById.get(md.Note_Id__c).ParentId).add(md);
    }

    List<Note_Metadata__c> alerts = new List<Note_Metadata__c>();
    Set<Id> alertIds = new Set<Id>();
    Set<Id> viewedNoteIds = new Set<Id>();
    for (Id noteParentId : notesByParentId.keyset()) {
      for (Note_Metadata__c md : noteMdByNoteParentId.get(noteParentId)) {
        if (md.Type__c == 'View') {
          viewedNoteIds.add(md.Note_Id__c);
        } else if (
          md.Mentioned_User__c == UserInfo.getUserId() &&
          !viewedNoteIds.contains(md.Note_Id__c)
        ) {
          alerts.add(md);
          alertIds.add(md.Note_Id__c);
        }
      }
    }

    return getNoteDtos(new NoteSelector().selectByIds(alertIds), alerts);
  }

  private static List<SubjectDTO> getRecordsFromTypeLookingUpToId(
    String typeName,
    Id contextRecordId,
    List<FieldDTO> fieldsToGet
  ) {
    List<SubjectDTO> subjects = new List<SubjectDTO>();
    String query = getContextQueryString(
      typeName,
      contextRecordId,
      fieldsToGet
    );

    List<SObject> records = Database.query(query);
    Set<String> recordIds = new Set<String>();
    Map<String, Schema.SObjectField> tokenByFieldName = Cache.globalDescribe
      .get(typeName)
      .getDescribe()
      .fields.getMap();
    for (SObject record : records) {
      recordIds.add(record.Id);
    }
    Map<Id, List<Note_Metadata__c>> noteMdByParentId = getNoteMdByParentId(
      recordIds
    );
    for (SObject record : records) {
      subjects.add(
        new SubjectDTO(
          record,
          getNoteDtos(
            record.getSObjects('Notes'),
            noteMdByParentId.containsKey(record.Id)
              ? noteMdByParentId.get(record.Id)
              : new List<Note_Metadata__c>()
          )
        )
      );
    }

    return subjects;
  }

  private static String getContextQueryString(
    String typeName,
    Id contextRecordId,
    List<FieldDTO> fieldsToGet
  ) {
    List<String> lookupsToParent = getLookupFieldsPointingToParentId(
      typeName,
      contextRecordId
    );
    Map<String, Schema.SObjectField> fieldsMap = Cache.globalDescribe.get(
        typeName
      )
      .getDescribe()
      .fields.getMap();
    List<String> fieldApiNames = new List<String>();
    for (FieldDTO field : fieldsToGet) {
      fieldApiNames.add(field.name);
      if (
        field.type == 'reference' &&
        fieldsMap.get(field.name).getDescribe().getReferenceTo()[0]
          .getDescribe()
          .fields.getMap()
          .containsKey('Name') &&
        fieldsMap.get(field.name).getDescribe().isAccessible()
      ) {
        if (
          typeName.toLowerCase() == 'opportunity' &&
          field.name.toLowerCase() == 'contactid'
        ) {
          continue;
        }

        // replace last instance of 'id' in field.name with '.name'
        String lookupNameField = field.isCustom
          ? field.name.toLowerCase().replace('__c', '__r.name')
          : field.name.substring(0, field.name.length() - 2) + '.Name';
        fieldApiNames.add(lookupNameField);
      }
    }
    if (fieldsMap.containsKey('Name') && !fieldApiNames.contains('Name')) {
      fieldApiNames.add('Name');
    }
    String whereClause = getWhereClause(lookupsToParent, contextRecordId);

    String query =
      'SELECT ' +
      String.join(fieldApiNames, ',') +
      ',(SELECT ' +
      'Body,CreatedBy.Name,CreatedBy.FullPhotoUrl,CreatedDate,ParentId ' +
      'FROM Notes ORDER BY CreatedDate desc) ' +
      'FROM ' +
      typeName +
      ' ' +
      whereClause +
      ' ' +
      'ORDER BY LastModifiedDate desc';
    System.debug(query);
    return query;
  }

  private static List<NoteDTO> getNoteDtos(
    List<Note> notes,
    List<Note_Metadata__c> noteMetadata
  ) {
    List<NoteDTO> noteDtos = new List<NoteDTO>();
    Map<Id, List<Note_Metadata__c>> noteMdByNoteId = new Map<Id, List<Note_Metadata__c>>();
    for (Note_Metadata__c metadata : noteMetadata) {
      if (!noteMdByNoteId.containsKey(metadata.Note_Id__c)) {
        noteMdByNoteId.put(metadata.Note_Id__c, new List<Note_Metadata__c>());
      }
      noteMdByNoteId.get(metadata.Note_Id__c).add(metadata);
    }
    if (notes != null && !notes.isEmpty()) {
      for (Note note : notes) {
        noteDtos.add(
          new NoteDTO(
            note,
            noteMdByNoteId.containsKey(note.Id)
              ? noteMdByNoteId.get(note.Id)
              : new List<Note_Metadata__c>()
          )
        );
      }
    }
    return noteDtos;
  }

  private static String getWhereClause(
    List<String> lookupsToParent,
    Id parentId
  ) {
    String whereClause = 'WHERE ';
    for (String lookup : lookupsToParent) {
      whereClause += lookup + ' = \'' + parentId + '\' OR ';
    }

    return whereClause.removeEnd(' OR ');
  }

  private static List<String> getLookupFieldsPointingToParentId(
    String childTypeName,
    Id parentId
  ) {
    List<String> lookupsToParent = new List<String>();
    Map<String, Schema.SObjectField> fieldTokenByName = Cache.globalDescribe
      .get(childTypeName)
      .getDescribe()
      .fields.getMap();
    for (String fieldName : fieldTokenByName.keyset()) {
      DescribeFieldResult fieldDescribe = fieldTokenByName.get(fieldName)
        .getDescribe();

      if (fieldDescribe.getType() == Schema.DisplayType.REFERENCE) {
        SObjectType lookupTargetType = fieldDescribe.getReferenceTo()?.get(0);
        if (lookupTargetType == null) {
          // null for `masterrecordid` field
          continue;
        }
        if (
          lookupTargetType.getDescribe().getName() ==
          parentId.getSobjectType().getDescribe().getName() && // is the field lookup to `parentId`
          fieldDescribe.isAccessible()
        ) {
          lookupsToParent.add(fieldName);
        }
      }
    }

    return lookupsToParent;
  }

  private static Map<Id, List<Note_Metadata__c>> getNoteMdByParentId(
    Set<String> recordIds
  ) {
    Map<Id, List<Note_Metadata__c>> noteMdByParentId = new Map<Id, List<Note_Metadata__c>>();
    for (
      Note_Metadata__c noteMd : new NoteMetadataSelector()
        .selectByNoteParentIds(recordIds)
    ) {
      if (!noteMdByParentId.containsKey(noteMd.Note_Parent_Id__c)) {
        noteMdByParentId.put(
          noteMd.Note_Parent_Id__c,
          new List<Note_Metadata__c>()
        );
      }
      noteMdByParentId.get(noteMd.Note_Parent_Id__c).add(noteMd);
    }
    return noteMdByParentId;
  }

  private static List<FieldDTO> getFieldDTOs(
    String objectname,
    List<String> fieldNamesToDto
  ) {
    SObjectType sObjType = Cache.globalDescribe.get(objectname);
    DescribeSObjectResult d = sObjType.getDescribe();
    Map<String, SObjectField> fieldTokenByApiName = d.fields.getMap();
    List<String> allFieldNames = new List<String>(fieldTokenByApiName.keyset());
    allFieldNames.sort();
    List<FieldDTO> fields = new List<FieldDTO>();

    if (fieldNamesToDto.isEmpty()) {
      for (String fieldName : allFieldNames) {
        DescribeFieldResult describe = fieldTokenByApiName.get(fieldName)
          .getDescribe();
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
    } else {
      fieldNamesToDto.sort();
      for (String fieldToDto : fieldNamesToDto) {
        DescribeFieldResult describe = fieldTokenByApiName.get(fieldToDto)
          .getDescribe();
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

  private static void throwAuraException(Exception e) {
    AuraHandledException ae = new AuraHandledException(
      e.getMessage() +
      '[' +
      e.getStackTraceString() +
      ']'
    );
    ae.setMessage(e.getMessage() + '[' + e.getStackTraceString() + ']');
    throw ae;
  }
}
