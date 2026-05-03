from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_task_deadline"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="answer_text",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="task",
            name="answer_file",
            field=models.FileField(blank=True, null=True,
                                   upload_to="task_submissions/"),
        ),
        migrations.AddField(
            model_name="task",
            name="submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
