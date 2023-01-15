global class SubjectDTO {
    @AuraEnabled global SObject record;
    @AuraEnabled global List<NoteDTO> notes = new List<NoteDTO>();

    public SubjectDTO(SObject record, List<NoteDTO> notes){
        this.record = record;
        this.notes = notes;
    }
}