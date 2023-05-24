public class TableViewDTO {
  @AuraEnabled
  public String id { get; set; }
  @AuraEnabled
  public String objectName { get; set; }
  @AuraEnabled
  public String state { get; set; }
  @AuraEnabled
  public String skinnyState { get; set; }
  @AuraEnabled
  public String viewer { get; set; }
  @AuraEnabled
  public String contextId { get; set; }

  public TableViewDTO() {
  }

  public TableViewDTO(Table_View__c view) {
    this.id = view.Id;
    this.objectName = view.Object_Name__c;
    this.state = view.State__c;
    this.skinnyState = view.Skinny_State__c;
    this.viewer = view.Viewer__c;
    this.contextId = view.Context_Id__c;
  }

  public Table_View__c convertToDbModel() {
    return new Table_View__c(
      Id = this.id,
      Object_Name__c = this.objectName,
      State__c = this.state,
      Skinny_State__c = this.skinnyState,
      Viewer__c = this.viewer,
      Context_Id__c = this.contextId
    );
  }
}
