package interview.course;

import java.nio.file.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FileServiceTest {
    @Test void acceptsBothOriginalUserWordArchives() throws Exception {
        for(String name:new String[]{"healthcare-autumn.docx","multicolor.docx"}) {
            var bytes=Files.readAllBytes(Path.of("../app/src/main/resources/resume-templates/word",name));
            assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document",FileService.validate(name,bytes));
        }
    }
    @Test void rejectsRenamedOrOversizedContent() {
        assertThrows(Api.Failure.class,()->FileService.validate("fake.docx","not a word archive".getBytes()));
        assertThrows(Api.Failure.class,()->FileService.validate("large.pdf",new byte[10485761]));
    }
    @Test void spreadsheetFormulaCannotExecuteInCsv() {
        assertEquals("\"'=SUM(1,2)\"",CourseController.csvCell("=SUM(1,2)"));
        assertEquals("\"'   @SUM(A1)\"",CourseController.csvCell("   @SUM(A1)"));
        assertEquals("\"line1\n\"\"quoted\"\"\"",CourseController.csvCell("line1\n\"quoted\""));
    }
}
