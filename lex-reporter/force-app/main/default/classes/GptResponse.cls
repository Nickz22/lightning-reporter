public class GptResponse {
  public String id;

  public Integer created;

  public String model;

  public Usage usage;

  public List<Choice> choices;

  public class Usage {
    public Integer prompt_tokens;

    public Integer completion_tokens;

    public Integer total_tokens;
  }

  public class Choice {
    public Message message;

    public String finish_reason;

    public Integer index;
  }

  public class Message {
    public String role;

    public String content;
  }
}
