"""Original editable teaching demonstration; no third-party assets or private data."""
import copy

def text(name, value, x, y, w, h, size=23, bold=False, color='#243746', **extra):
    return dict(type='shape', name=name, text=value, position=dict(left=x,top=y,width=w,height=h),fontSize=size,bold=bold,color=color,**extra)

def header(section,topic):
    return [text('section',section,44,22,872,38,28,True,'#315D7C'),
            dict(type='shape',name='separator',geometry='rect',position=dict(left=44,top=68,width=872,height=1),fill='#8A999F'),
            text('topic',topic,44,84,872,42,24,True)]

def slide(id,section,topic,elements,notes):
    return dict(id=id,background='#F7F7F7',elements=header(section,topic)+elements,notes=notes)

def specifications():
    first=slide('framework','任务交接','结果、权限与反馈',[
        text('result','结果',44,164,130,40,26,True,'#167A85'),
        text('result-detail','交付什么，何时完成？\n把交付物和时间说清楚。',208,164,660,76),
        text('authority','权限',44,270,130,40,26,True,'#167A85'),
        text('authority-detail','哪些可以自行处理？\n哪些事项需要请示？',208,270,660,76),
        text('feedback','反馈',44,376,130,40,26,True,'#167A85'),
        text('feedback-detail','什么情况下反馈，向谁反馈？\n遇到变化时及时确认。',208,376,660,76)
    ],'建议3分钟。请学生区分交付目标与处置权限。本页为自编练习框架，不归属于某个学者。下一页用资料整理任务检查三项是否清楚。')
    case=slide('case','任务交接','资料整理中的权限边界',[
        text('material','负责人请助教周五前提交分类目录。助教可调整目录层级，\n但不得自行删除原始文件。整理中发现部分资料归属不清。',44,153,872,100),
        text('question-heading','讨论',44,292,350,38,24,True,'#167A85'),
        text('question','哪些工作可以继续？\n哪些需要反馈？',44,342,360,80),
        text('reveal_1_1','参考分析\n继续登记已知资料，保留原件。\n记录归属问题，向负责人确认。',470,292,446,142,23,False),
        text('source','教学情境（虚构）',44,478,872,30,16,False,'#586973')
    ],'建议4分钟。先读情境，停顿让学生提出可继续与需请示的事项。可能回答：继续分类、停止全部工作、直接删去不明资料。追问：材料中的授权支持哪个动作？点击1显示参考分析。允许不同合理方案，但要求说明权限和反馈依据。回扣结果目标不自动扩大权限。来源：本项目自编虚构练习。')
    overview=slide('review','任务交接','知识回顾',[
        text('root','任务交接',44,278,180,64,25,True,'#FFFFFF',geometry='roundRect',fill='#315D7C'),
        text('result','结果',328,170,150,48,24,True,'#167A85'),
        text('result-leaves','交付物\n时间',610,153,270,82),
        text('authority','权限',328,280,150,48,24,True,'#167A85'),
        text('authority-leaves','可自行处理\n须请示',610,263,270,82),
        text('feedback','反馈',328,390,150,48,24,True,'#167A85'),
        text('feedback-leaves','触发条件\n接收人',610,373,270,82),
        *[dict(type='connector',name='root-'+n,**{'from':'root','to':n},fromSide='right',toSide='left',color='#819AA8') for n in ['result','authority','feedback']],
        *[dict(type='connector',name='leaf-'+n,**{'from':n,'to':n+'-leaves'},fromSide='right',toSide='left',color='#819AA8') for n in ['result','authority','feedback']]
    ],'建议2分钟。请学生用自己的任务各填一次交付物、权限和反馈安排。连线表示分类关系，不表示因果或固定先后顺序。知识回顾对应讲义三项，不能用未讲内容填充分支。')
    after=dict(version=1,font='Microsoft YaHei',slideSize=dict(width=960,height=540),slides=[first,case,overview])
    before=copy.deepcopy(after)
    before['slides'][1]=slide('case-before','任务交接','资料整理中的权限边界',[
        text('dense-material','负责人请助教周五前提交分类目录。助教可以调整目录层级，但不能自行删除原始文件。整理中发现部分资料归属不清。请讨论哪些工作可以继续、哪些需要反馈。参考分析：继续登记已知资料，保留原件；记录归属问题，向负责人确认后再处理。',44,170,872,240),
        text('source','教学情境（虚构）',44,478,872,30,16,False,'#586973')
    ],'建议4分钟。修订前材料、问题与参考分析同时呈现，讨论节奏不够清楚；与修订后对比时不要将这种做法作为推荐。情境为本项目原创虚构练习。')
    standard=dict(version=1,font='Microsoft YaHei',slideSize=dict(width=960,height=540),slides=[slide('standard','章节标题','本页主题',[
        text('main','正文区域\n放置定义、资料或可编辑关系图。',44,172,872,130),
        text('caption','图注与讨论区应与正文保持独立间距。',44,366,872,55),
        text('source','必要来源放在此区域。',44,478,872,30,16,False,'#586973')
    ],'原创无标识标准页。用于演示角色、间距与配色，不含学校或教师素材。没有母版占位符绑定，不是功能完整的模板库。')])
    return {'standard':standard,'before':before,'after':after}
