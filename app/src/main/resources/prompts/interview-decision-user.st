简历摘要：
{resumeSummary}

当前轮：
- roundId: {currentRoundId}
- 主问题序号: {rootQuestionIndex}
- 追问层级: {followUpDepth}
- 当前问题: {currentQuestion}
- 当前类别: {currentCategory}
- 用户回答: {currentAnswer}

历史轮次（JSON）：
{historyJson}

请只返回一个 JSON 对象。
返回要求：
1. action 字段只能是 FOLLOW_UP、NEXT_QUESTION、END 三者之一。
2. reason 字段填写中文原因说明。
3. nextQuestion 字段在 action=END 时返回空字符串；否则返回下一轮中文问题文本。
