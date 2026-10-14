/** 模拟面试对话中的一条消息 */
export interface InterviewChatMessage {
  type: 'interviewer' | 'user';
  content: string;
  category?: string;
  questionIndex?: number;
}
